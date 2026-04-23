import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { Save, Plus, Trash2, CheckCircle2, AlertTriangle, Table as TableIcon } from 'lucide-react';

interface DraftRow {
  tempId: string;
  type_dossier: string;
  date_arrivee: string;
  numero_enregistrement: string;
  numero_expediteur: string;
  expediteur: string;
  objet: string;
  orientation: string;
  numero_orientation: string;
}

export const TableauDossier = () => {
  const { bureauId, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const createEmptyRow = (): DraftRow => ({
    tempId: Math.random().toString(36).substr(2, 9),
    type_dossier: 'Arrivée',
    date_arrivee: new Date().toISOString().split('T')[0],
    numero_enregistrement: '',
    numero_expediteur: '',
    expediteur: '',
    objet: '',
    orientation: '',
    numero_orientation: ''
  });

  const [rows, setRows] = useState<DraftRow[]>([
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
  ]);

  const addRow = () => {
    setRows([...rows, createEmptyRow()]);
  };

  const removeRow = (idToRemove: string) => {
    setRows(rows.filter(r => r.tempId !== idToRemove));
    if (rows.length === 1) {
      setRows([createEmptyRow()]); // always keep at least one
    }
  };

  const handleRowChange = (tempId: string, field: keyof DraftRow, value: string) => {
    setRows(rows.map(row => {
      if (row.tempId === tempId) {
        const newData = { ...row, [field]: value };
        // Auto-switch to Départ if a numero_orientation is filled
        if (field === 'numero_orientation' && value && row.type_dossier === 'Arrivée') {
           newData.type_dossier = 'Départ';
        }
        return newData;
      }
      return row;
    }));
  };

  const handleExport = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // 1. Filter out completely empty rows
      const validRows = rows.filter(r => r.objet.trim() !== '');

      if (validRows.length === 0) {
        throw new Error("Veuillez remplir au moins l'objet d'un dossier pour l'exporter.");
      }

      // 2. Validate essential fields
      const missingDates = validRows.some(r => !r.date_arrivee);
      if (missingDates) {
        throw new Error("La 'Date d'arrivée' est obligatoire pour chaque dossier rempli.");
      }

      // 3. Prepare data for Supabase
      const dossiersToInsert = validRows.map(row => {
        const year = new Date().getFullYear();
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const trackingCode = `SSD-${year}-${randomNum}`;
        const finalStatus = row.type_dossier === 'Départ' ? 'Transmis' : 'Reçu';

        return {
          bureau_id: bureauId,
          user_id: user?.id,
          tracking_code: trackingCode,
          statut: finalStatus,
          type_dossier: row.type_dossier,
          date_arrivee: row.date_arrivee,
          numero_enregistrement: row.numero_enregistrement,
          numero_expediteur: row.numero_expediteur,
          expediteur: row.expediteur,
          objet: row.objet,
          orientation: row.orientation,
          numero_orientation: row.numero_orientation,
        };
      });

      // 4. Insert into database
      const { error: dbError } = await supabase
        .from('dossiers')
        .insert(dossiersToInsert);

      if (dbError) throw dbError;

      // 5. Success UI reset
      setSuccess(`${validRows.length} dossiers ont été exportés avec succès !`);
      setRows([
        createEmptyRow(),
        createEmptyRow(),
        createEmptyRow(),
        createEmptyRow(),
        createEmptyRow(),
      ]);

      // Hide success message after 4 seconds
      setTimeout(() => setSuccess(null), 4000);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Une erreur est survenue lors de l'exportation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[100%] mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center">
          <TableIcon className="h-8 w-8 mr-3 text-blue-600" />
          Saisie en Masse (Tableau)
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Saisissez rapidement plusieurs dossiers à la volée. Laissez vides les lignes inutilisées.
        </p>
      </div>

      {success && (
        <div className="bg-green-50 p-4 rounded-2xl border border-green-100 mb-6 flex items-start animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-green-600 mr-3 shrink-0 mt-0.5" />
          <p className="text-sm font-bold text-green-800">{success}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 p-4 rounded-2xl border border-red-100 mb-6 flex items-start">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-3 shrink-0 mt-0.5" />
          <p className="text-sm font-bold text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white shadow-xl rounded-3xl overflow-hidden border border-gray-100 flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 text-center w-12">#</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest min-w-[120px]">Type</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest min-w-[150px]">Date *</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest min-w-[140px]">N° Enreg</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest min-w-[140px]">N° Service</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest min-w-[300px]">Objet *</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest min-w-[150px]">Expéditeur</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest min-w-[150px]">Orientation</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest min-w-[140px]">N° Orientation</th>
                <th className="px-2 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {rows.map((row, index) => (
                <tr key={row.tempId} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-2 py-2 text-center text-xs font-bold text-gray-300 pointer-events-none select-none">
                    {index + 1}
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={row.type_dossier}
                      onChange={(e) => handleRowChange(row.tempId, 'type_dossier', e.target.value)}
                      className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 outline-none transition-all"
                    >
                      <option value="Arrivée">Arrivée</option>
                      <option value="Départ">Départ</option>
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="date"
                      value={row.date_arrivee}
                      onChange={(e) => handleRowChange(row.tempId, 'date_arrivee', e.target.value)}
                      className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1.5 text-xs font-medium text-gray-900 outline-none transition-all"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      placeholder="Ex: 125/2026"
                      value={row.numero_enregistrement}
                      onChange={(e) => handleRowChange(row.tempId, 'numero_enregistrement', e.target.value)}
                      className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1.5 text-xs font-bold text-gray-900 outline-none transition-all placeholder-gray-300 uppercase"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      placeholder="Ex: SSD/DL"
                      value={row.numero_expediteur}
                      onChange={(e) => handleRowChange(row.tempId, 'numero_expediteur', e.target.value)}
                      className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1.5 text-xs font-bold text-blue-700 outline-none transition-all placeholder-gray-300 uppercase"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      placeholder="Saisissez l'objet du dossier..."
                      value={row.objet}
                      onChange={(e) => handleRowChange(row.tempId, 'objet', e.target.value)}
                      className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1.5 text-xs font-medium text-gray-900 outline-none transition-all placeholder-gray-300"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={row.expediteur}
                      onChange={(e) => handleRowChange(row.tempId, 'expediteur', e.target.value)}
                      className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1.5 text-xs font-medium text-gray-700 outline-none transition-all"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={row.orientation}
                      onChange={(e) => handleRowChange(row.tempId, 'orientation', e.target.value)}
                      className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1.5 text-xs font-medium text-gray-700 outline-none transition-all uppercase"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={row.numero_orientation}
                      onChange={(e) => handleRowChange(row.tempId, 'numero_orientation', e.target.value)}
                      className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1.5 text-xs font-bold text-gray-900 outline-none transition-all"
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      onClick={() => removeRow(row.tempId)}
                      className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-md"
                      title="Supprimer la ligne"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Actions Footer */}
        <div className="bg-gray-50 border-t border-gray-100 p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={addRow}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-bold text-blue-600 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 focus:outline-none transition-all"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une ligne
          </button>

          <button
            onClick={handleExport}
            disabled={loading}
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-black text-white bg-blue-600 shadow-lg shadow-blue-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              'Exportation en cours...'
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Exporter vers Supabase
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
