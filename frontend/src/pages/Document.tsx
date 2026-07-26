import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, FileText, User as UserIcon, Upload, Trash2, Loader2, X, Download, Eye, Star, RotateCcw, LayoutGrid, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';

interface Document {
  id: number;
  filename: string;
  size: number;
  mimeType: string;
  isFavorite: boolean;
  deletedAt: string | null;
  createdAt: string;
  status?: string;
  pageCount?: number | null;
  wordCount?: number | null;
}

interface PreviewDocument extends Document {
  url: string;
}

export default function DocumentScreen() {
  const { user, logout } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedPreviewDoc, setSelectedPreviewDoc] = useState<PreviewDocument | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<'all' | 'favorites' | 'trash'>('all');
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [currentFilter]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/documents?filter=${currentFilter}`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDocumentClick = async (doc: Document) => {
    try {
      setPreviewLoading(true);
      setIsPreviewOpen(true);
      const response = await api.get(`/documents/${doc.id}`);
      setSelectedPreviewDoc(response.data);
    } catch (error) {
      console.error('Error fetching document preview:', error);
      toast.error('Failed to load document preview.');
      setIsPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setIsPreviewOpen(false);
    setSelectedPreviewDoc(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      await api.post('/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (currentFilter !== 'all') {
        setCurrentFilter('all');
      } else {
        await fetchDocuments();
      }
      toast.success('Document uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading document:', error);
      const errorMessage = error.response?.data?.message || 'Failed to upload document. Please try again.';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const confirmDelete = async () => {
    if (!documentToDelete) return;
    
    const isTrash = currentFilter === 'trash';
    try {
      await api.delete(`/documents/${documentToDelete.id}`);
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentToDelete.id));
      toast.success(isTrash ? 'Document permanently deleted!' : 'Document moved to trash.');
    } catch (error: any) {
      console.error('Error deleting document:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete document.';
      toast.error(errorMessage);
    } finally {
      setDocumentToDelete(null);
    }
  };

  const handleToggleFavorite = async (id: number) => {
    try {
      await api.patch(`/documents/${id}/favorite`);
      if (currentFilter === 'favorites') {
        setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      } else {
        setDocuments((prev) => prev.map((doc) => doc.id === id ? { ...doc, isFavorite: !doc.isFavorite } : doc));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite status.');
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await api.patch(`/documents/${id}/restore`);
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      toast.success('Document restored successfully!');
    } catch (error) {
      console.error('Error restoring document:', error);
      toast.error('Failed to restore document.');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6 lg:px-8 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">DocFlow</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
              <UserIcon className="h-4 w-4" />
              <span>{user?.firstName} {user?.lastName}</span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 transition-colors bg-white border border-gray-200 hover:border-red-200 px-3 py-1.5 rounded-lg shadow-sm"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="w-full md:w-64 p-4 sm:p-6 lg:p-8 border-r border-gray-200">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setCurrentFilter('all')}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors ${currentFilter === 'all' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              <LayoutGrid className="w-5 h-5" />
              All Documents
            </button>
            <button
              onClick={() => setCurrentFilter('favorites')}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors ${currentFilter === 'favorites' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              <Star className="w-5 h-5" />
              Favorites
            </button>
            <button
              onClick={() => setCurrentFilter('trash')}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors ${currentFilter === 'trash' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              <Trash2 className="w-5 h-5" />
              Trash
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
            <p className="text-gray-500 mt-1">Manage and view all your uploaded documents.</p>
          </div>
          
          <button
            onClick={handleUploadClick}
            disabled={uploading}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.docx,.png,.jpg,.jpeg"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Stats Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Documents</p>
              <h3 className="text-3xl font-bold text-gray-900">
                {loading ? '-' : documents.length}
              </h3>
            </div>
          </div>
        </div>

        {/* Document List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 capitalize">
              {currentFilter === 'all' ? 'All Documents' : currentFilter}
            </h2>
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-600" />
              <p>Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-gray-400 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-lg font-medium text-gray-900 mb-1">No documents yet</p>
              <p className="text-sm mb-4">Upload your first document to get started.</p>
              <button
                onClick={handleUploadClick}
                className="text-indigo-600 font-medium hover:text-indigo-700"
              >
                Upload Document &rarr;
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-gray-500 text-sm">
                    <th className="px-6 py-4 font-medium">Name</th>
                    <th className="px-6 py-4 font-medium">Size</th>
                    <th className="px-6 py-4 font-medium">Date Uploaded</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => handleDocumentClick(doc)}
                          className="flex items-center gap-3 text-left hover:text-indigo-600 transition-colors w-full"
                        >
                          <FileText className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
                          <span className="font-medium text-gray-900 group-hover:text-indigo-600">{doc.filename}</span>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm">
                        {formatSize(doc.size)}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm">
                        {formatDate(doc.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 transition-opacity">
                          {currentFilter !== 'trash' && (
                            <button
                              onClick={() => handleToggleFavorite(doc.id)}
                              className={`p-2 rounded-lg transition-colors ${doc.isFavorite ? 'text-yellow-500 hover:bg-yellow-50' : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'}`}
                              title={doc.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              <Star className={`w-5 h-5 ${doc.isFavorite ? 'fill-current' : ''}`} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDocumentClick(doc)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Preview"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          {currentFilter === 'trash' && (
                            <button
                              onClick={() => handleRestore(doc.id)}
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Restore"
                            >
                              <RotateCcw className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => setDocumentToDelete(doc)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={currentFilter === 'trash' ? 'Permanently Delete' : 'Move to Trash'}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      </div>

      {/* Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  {selectedPreviewDoc?.filename || 'Loading Document...'}
                </h3>
                {selectedPreviewDoc && (
                  <div className="flex items-center gap-2 border-l border-gray-200 pl-4 ml-2 hidden sm:flex">
                    <span className="text-sm text-gray-500 font-medium mr-1">Processed Data:</span>
                    {selectedPreviewDoc.status && (
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedPreviewDoc.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                        selectedPreviewDoc.status === 'ERROR' ? 'bg-red-100 text-red-800' : 
                        'bg-indigo-100 text-indigo-800'
                      }`}>
                        {selectedPreviewDoc.status}
                      </span>
                    )}
                    {selectedPreviewDoc.pageCount != null && (
                      <span className="px-2.5 py-0.5 rounded-full bg-gray-200 text-gray-700 text-xs font-medium">
                        {selectedPreviewDoc.pageCount} Pages
                      </span>
                    )}
                    {selectedPreviewDoc.wordCount != null && (
                      <span className="px-2.5 py-0.5 rounded-full bg-gray-200 text-gray-700 text-xs font-medium">
                        {selectedPreviewDoc.wordCount} Words
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={closePreview}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto bg-gray-100/50 flex flex-col items-center justify-center min-h-[500px] p-6">
              {previewLoading ? (
                <div className="flex flex-col items-center text-gray-500">
                  <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
                  <p className="font-medium text-gray-600">Loading secure preview...</p>
                </div>
              ) : selectedPreviewDoc ? (
                <>
                  {selectedPreviewDoc.mimeType.startsWith('image/') ? (
                    <img 
                      src={selectedPreviewDoc.url} 
                      alt={selectedPreviewDoc.filename}
                      className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-sm border border-gray-200/50 bg-white"
                    />
                  ) : selectedPreviewDoc.mimeType === 'application/pdf' ? (
                    <iframe 
                      src={selectedPreviewDoc.url} 
                      className="w-full h-[75vh] rounded-xl shadow-sm border border-gray-200/50 bg-white"
                      title={selectedPreviewDoc.filename}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-500 bg-white p-12 rounded-3xl shadow-sm border border-gray-100 max-w-md text-center h-[50vh]">
                      <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                        <FileText className="w-12 h-12 text-indigo-400" />
                      </div>
                      <h4 className="text-2xl font-bold text-gray-900 mb-3">Preview not available</h4>
                      <p className="mb-8 text-gray-500 leading-relaxed">
                        Word documents cannot be previewed directly in the browser. 
                        Please download the file to view its contents.
                      </p>
                      <a 
                        href={selectedPreviewDoc.url}
                        download={selectedPreviewDoc.filename}
                        className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-medium shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-[0.98]"
                      >
                        <Download className="w-5 h-5" />
                        Download File
                      </a>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {documentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {currentFilter === 'trash' ? 'Permanently Delete?' : 'Move to Trash?'}
              </h3>
              <p className="text-gray-500 mb-6">
                {currentFilter === 'trash'
                  ? `Are you sure you want to permanently delete "${documentToDelete.filename}"? This action cannot be undone.`
                  : `Are you sure you want to move "${documentToDelete.filename}" to the trash?`}
              </p>
              
              <div className="flex w-full gap-3">
                <button
                  onClick={() => setDocumentToDelete(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-xl transition-colors shadow-sm shadow-red-200"
                >
                  {currentFilter === 'trash' ? 'Delete Permanently' : 'Move to Trash'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
