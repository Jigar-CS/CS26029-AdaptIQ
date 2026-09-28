'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import {
  X,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Loader2,
} from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CsvImportModal({ isOpen, onClose, onSuccess }: CsvImportModalProps) {
  const [csvText, setCsvText] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      handlePreview(content);
    };
    reader.readAsText(file);
  };

  const handlePreview = async (contentToPreview?: string) => {
    const text = contentToPreview || csvText;
    if (!text.trim()) {
      setErrorMsg('Please paste or upload CSV content first.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.post('/admin/students/preview-csv', { csvText: text });
      setPreviewData(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to preview CSV.');
      setPreviewData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!previewData || !previewData.validRows || previewData.validRows.length === 0) {
      setErrorMsg('No valid student rows to import.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.post('/admin/students/import', { rows: previewData.validRows });
      setImportResult(res);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to import students.');
    } finally {
      setLoading(false);
    }
  };

  const downloadSampleTemplate = () => {
    const sample = `enrollmentNumber,name,email,institute,department,program,semester,division,graduationYear
24CS001,Rahul Patel,rahul@charusat.edu.in,CSPIT,CSE,BTECH,5,A,2028
24CS002,Priya Sharma,priya@charusat.edu.in,CSPIT,CSE,BTECH,5,A,2028
24CS003,Aarav Desai,aarav@charusat.edu.in,CSPIT,CSE,BTECH,5,B,2028`;

    const blob = new Blob([sample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clias_authorized_students_sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Import Authorized Students</h3>
              <p className="text-xs text-slate-500">Upload CSV to populate the official institutional student roster</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {importResult && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-sm font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>{importResult.message}</span>
            </div>
          )}

          {/* Upload and Sample Bar */}
          <div className="flex items-center justify-between">
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition">
              <UploadCloud className="w-4 h-4" />
              <span>Select CSV File</span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={downloadSampleTemplate}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium transition"
            >
              <Download className="w-3.5 h-3.5" />
              Download Sample CSV
            </button>
          </div>

          {/* CSV Textarea */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Or Paste CSV Data Directly:
            </label>
            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="enrollmentNumber,name,email,institute,department,program,semester,division,graduationYear..."
              className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            ></textarea>
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={() => handlePreview()}
                disabled={loading || !csvText.trim()}
                className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'Validating...' : 'Validate & Preview'}
              </button>
            </div>
          </div>

          {/* Preview Results */}
          {previewData && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              {/* Summary Badges */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Rows</p>
                  <p className="text-base font-bold text-slate-800">{previewData.totalRows}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                  <p className="text-[10px] text-emerald-600 uppercase font-semibold">Valid Rows</p>
                  <p className="text-base font-bold text-emerald-700">{previewData.validCount}</p>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-center">
                  <p className="text-[10px] text-rose-600 uppercase font-semibold">Invalid Rows</p>
                  <p className="text-base font-bold text-rose-700">{previewData.invalidCount}</p>
                </div>
              </div>

              {/* Invalid Rows Diagnostics */}
              {previewData.invalidRows && previewData.invalidRows.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-rose-700 mb-2 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Data Validation Errors (will be skipped):
                  </h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {previewData.invalidRows.map((inv: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-200 text-[11px] text-rose-900"
                      >
                        <span className="font-bold mr-2">Row {inv.rowNumber}:</span>
                        <span>{inv.errors.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Valid Rows Preview Table */}
              {previewData.validRows && previewData.validRows.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Valid Records Preview (First 5):
                  </h4>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="p-2.5">Enrollment</th>
                          <th className="p-2.5">Name</th>
                          <th className="p-2.5">Email</th>
                          <th className="p-2.5">Dept</th>
                          <th className="p-2.5">Sem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {previewData.validRows.slice(0, 5).map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-slate-900">{row.enrollmentNumber}</td>
                            <td className="p-2.5 text-slate-700">{row.name}</td>
                            <td className="p-2.5 text-slate-500">{row.email}</td>
                            <td className="p-2.5">{row.department}</td>
                            <td className="p-2.5">{row.semester}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCommitImport}
            disabled={loading || !previewData || previewData.validCount === 0}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>Confirm & Import ({previewData?.validCount || 0} Records)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
