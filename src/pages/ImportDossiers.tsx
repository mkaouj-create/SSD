import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, ChevronRight, Download } from 'lucide-react';
import * as xlsx from 'xlsx';

export const ImportDossiers = () => {
  const { bureauId, user, role } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const EXPECTED_HEADERS = [
    "Date d'arrivée (JJ/MM/AAAA)",
    "N° Enregistrement",
    "N° Service",
    "Objet",
    "Expéditeur",
    "Orientation",
    "N° Orientation (Départ)"
  ];

  const handleDownloadTemplate = () => {
    const ws = xlsx.utils.aoa_to_sheet([EXPECTED_HEADERS]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Modèle_Dossiers");
    xlsx.writeFile(wb, "Modele_Import_Dossiers_SSD.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setErrors([]);
    setSuccess(null);
    setParsedData([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = xlsx.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Convert array of arrays to handle custom mapping
        const data = xlsx.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        if (data.length < 2) {
          setErrors(["Le fichier est vide ou ne contient que la ligne d'en-tête."]);
          return;
        }

        const headers = data[0] as string[];
        const rows = data.slice(1);
        
        let localErrors: string[] = [];
        let validData: any[] = [];

        rows.forEach((row, index) => {
          // Skip completely empty rows
          if (!row || row.length === 0 || row.every(cell => !cell)) return;

          const rowNum = index + 2; // +1 for 0-index, +1 for header
          
          // Helper to map current header index or default if template differs slightly
          const getVal = (colIndex: number) => row[colIndex] ? String(row[colIndex]).trim() : '';

          let rawDate = row[0];
          let formattedDate = new Date().toISOString().split('T')[0]; // Default to today
          
          if (rawDate) {
            // Check if date object
            if (rawDate instanceof Date) {
              formattedDate = rawDate.toISOString().split('T')[0];
            } else {
               // Try to parse JJ/MM/AAAA
               let parts = String(rawDate).split('/');
               if (parts.length === 3) {
                 formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
               }
            }
          } else {
             localErrors.push(`Ligne ${rowNum}: Date d'arrivée manquante.`);
          }

          const numEnreg = getVal(1);
          const numService = getVal(2);
          const objet = getVal(3);
          const expediteur = getVal(4);
          const orientation = getVal(5);
          const numOrientation = getVal(6);

          if (!objet) {
             localErrors.push(`Ligne ${rowNum}: Objet du dossier manquant.`);
          }

          // Determine if it's "Arrivée" or "Départ"
          const typeDossier = numOrientation ? 'Départ' : 'Arrivée';
          const statut = numOrientation ? 'Transmis' : 'Reçu';

          if (objet) {
             validData.push({
               type_dossier: typeDossier,
               date_arrivee: formattedDate,
               numero_enregistrement: numEnreg,
               numero_expediteur: numService,
               objet: objet,
               expediteur: expediteur,
               orientation: orientation,
               numero_orientation: numOrientation,
               statut: statut,
               isWarning: (!numEnreg && !numService)
             });
          }
        });

        if (localErrors.length > 0) {
          setErrors(localErrors);
        } else {
          setParsedData(validData);
        }

      } catch (err: any) {
        console.error(err);
        setErrors(["Une erreur s'est produite lors de la lecture du fichier. Assurez-vous qu'il s'agit bien d'un fichier Excel (.xlsx)."]);
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;
    setLoading(true);
    setErrors([]);

    try {
      // 1. Duplicate check for batch
      const rowsWithEnreg = parsedData.filter(r => r.numero_enregistrement && r.numero_enregistrement.trim() !== '');
      if (rowsWithEnreg.length > 0) {
        // Chunk conditions to prevent excessively long URLs in initial fetch if thousands of rows
        const CHUNK_SIZE = 50;
        let allDuplicates: any[] = [];
        
        for (let i = 0; i < rowsWithEnreg.length; i += CHUNK_SIZE) {
           const chunk = rowsWithEnreg.slice(i, i + CHUNK_SIZE);
           const orConditions = chunk
             .map(r => `and(numero_enregistrement.eq."${r.numero_enregistrement.trim()}",date_arrivee.eq."${r.date_arrivee}")`)
             .join(',');
             
           const { data: duplicates, error: selectError } = await supabase
             .from('dossiers')
             .select('numero_enregistrement, date_arrivee')
             .eq('bureau_id', bureauId)
             .or(orConditions);
             
           if (selectError) throw selectError;
           if (duplicates) {
             allDuplicates = [...allDuplicates, ...duplicates];
           }
        }

        if (allDuplicates.length > 0) {
           const dupNames = allDuplicates.map(d => `${d.numero_enregistrement} (${d.date_arrivee})`).join(', ');
           throw new Error(`Dossiers existants détectés : ${dupNames}. Vous essayez d'importer des Numéros d'Enregistrements qui existent déjà à la même Date.`);
        }
      }

      // Process in batches
      const dossiersToInsert = parsedData.map(d => {
         const year = new Date().getFullYear();
         const randomNum = Math.floor(1000 + Math.random() * 9000);
         const generatedTrackingCode = `SSD-${year}-${randomNum}`;
         return {
            bureau_id: bureauId,
            user_id: user?.id,
            tracking_code: generatedTrackingCode,
            type_dossier: d.type_dossier,
            date_arrivee: d.date_arrivee,
            numero_enregistrement: d.numero_enregistrement,
            numero_expediteur: d.numero_expediteur,
            objet: d.objet,
            expediteur: d.expediteur,
            orientation: d.orientation,
            numero_orientation: d.numero_orientation,
            statut: d.statut
         };
      });

      const { error } = await supabase
        .from('dossiers')
        .insert(dossiersToInsert);

      if (error) throw error;
      
      setSuccess(`${dossiersToInsert.length} dossiers ont été importés avec succès !`);
      setParsedData([]);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      
    } catch (err: any) {
      console.error('Import error:', err);
      setErrors([err.message || 'Erreur lors de l\'enregistrement dans la base de données.']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link to="/dossiers" className="inline-flex items-center text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux dossiers
          </Link>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Importation de Dossiers</h1>
          <p className="mt-2 text-sm text-gray-600">
            Importez un tableau Excel directement dans la base de données du bureau.
          </p>
        </div>
        <button
          onClick={handleDownloadTemplate}
          className="inline-flex items-center justify-center rounded-xl border-2 border-blue-600 bg-white px-5 py-2.5 text-sm font-black text-blue-600 hover:bg-blue-50 transition-all shadow-sm"
        >
          <Download className="mr-2 h-5 w-5" />
          Télécharger le Modèle
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Sidebar */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center">
              <FileSpreadsheet className="h-5 w-5 mr-2 text-blue-600" />
              Instructions
            </h3>
            <ol className="space-y-4 text-sm font-medium text-gray-600">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-black text-blue-600">1</span>
                 Téléchargez le modèle Excel via le bouton en haut à droite.
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-black text-blue-600">2</span>
                 Remplissez le fichier avec vos données (veillez à respecter le format des dates).
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-black text-blue-600">3</span>
                 Chargez votre fichier ici pour une prévisualisation.
              </li>
            </ol>
          </div>

          <div className="bg-gray-50 p-6 rounded-3xl border border-dashed border-gray-300 relative text-center hover:bg-gray-100 transition-all cursor-pointer">
             <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls, .csv"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
             />
             <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
             <p className="text-sm font-bold text-gray-700">Cliquez ou glissez un fichier Excel</p>
             <p className="text-xs text-gray-500 mt-1">.xlsx, .xls ou .csv</p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="md:col-span-2">
           {success && (
             <div className="bg-green-50 p-6 rounded-3xl border border-green-100 mb-6 flex items-start">
               <CheckCircle2 className="h-6 w-6 text-green-600 mr-3 flex-shrink-0" />
               <div>
                 <h4 className="text-sm font-black text-green-900">Importation Réussie !</h4>
                 <p className="text-sm font-medium text-green-700 mt-1">{success}</p>
                 <button onClick={() => navigate('/dossiers')} className="mt-4 text-sm font-bold text-green-800 hover:underline">
                   Voir les dossiers
                 </button>
               </div>
             </div>
           )}

           {errors.length > 0 && (
             <div className="bg-red-50 p-6 rounded-3xl border border-red-100 mb-6">
               <div className="flex items-center mb-3">
                 <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
                 <h4 className="text-sm font-black text-red-900">Erreurs détectées</h4>
               </div>
               <ul className="text-sm font-medium text-red-700 list-disc list-inside space-y-1">
                 {errors.map((err, i) => <li key={i}>{err}</li>)}
               </ul>
             </div>
           )}

           {parsedData.length > 0 && !success && (
             <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 flex flex-col h-full">
               <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                 <div>
                   <h3 className="text-lg font-black text-gray-900 tracking-tight">Prévisualisation</h3>
                   <p className="text-xs font-bold text-gray-500">{parsedData.length} dossiers prêts à être importés</p>
                 </div>
                 <button
                    onClick={handleImport}
                    disabled={loading}
                    className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-black text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all disabled:opacity-50"
                 >
                    {loading ? 'Importation...' : 'Valider et Importer'}
                    {!loading && <ChevronRight className="ml-2 h-4 w-4" />}
                 </button>
               </div>
               
               <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                   <thead className="bg-white">
                     <tr>
                       <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                       <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                       <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">N°-Enreg / N°-Service</th>
                       <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Objet</th>
                       <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Orientation</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                     {parsedData.slice(0, 50).map((row, i) => (
                       <tr key={i} className="hover:bg-gray-50 transition-colors">
                         <td className="px-6 py-4 whitespace-nowrap">
                           <span className={`px-2 py-1 text-[10px] font-black uppercase rounded-lg ${row.type_dossier === 'Arrivée' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                             {row.type_dossier}
                           </span>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-600">
                           {row.date_arrivee}
                         </td>
                         <td className="px-6 py-4 text-xs font-bold text-gray-900">
                           {row.numero_enregistrement || '-'} <span className="text-gray-400">/</span> <span className="text-blue-600">{row.numero_expediteur || '-'}</span>
                         </td>
                         <td className="px-6 py-4 text-xs font-medium text-gray-700 max-w-xs truncate">
                           {row.objet}
                         </td>
                         <td className="px-6 py-4 text-xs font-medium text-gray-500 max-w-[150px] truncate">
                           {row.numero_orientation ? <span className="text-green-600 font-bold">{row.numero_orientation}</span> : row.orientation}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
                 {parsedData.length > 50 && (
                    <div className="p-4 text-center text-xs font-medium text-gray-500 bg-gray-50 border-t border-gray-100">
                       Et {parsedData.length - 50} autres lignes...
                    </div>
                 )}
               </div>
             </div>
           )}

           {!file && !success && (
              <div className="h-full min-h-[300px] border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400">
                 <FileSpreadsheet className="h-12 w-12 mb-4 text-gray-300" />
                 <p className="font-medium text-sm">En attente d'un fichier...</p>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};
