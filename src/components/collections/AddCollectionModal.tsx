import { useState } from 'react';
import { X, Folder } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface AddCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export function AddCollectionModal({ isOpen, onClose, onAdded }: AddCollectionModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: insertError } = await supabase.from('collections').insert({
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        type: 'manual'
      });

      if (insertError) throw insertError;

      onAdded();
      setName('');
      setDescription('');
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create collection');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-bg-primary/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-bg-secondary border-2 border-text-primary w-full max-w-xl flex flex-col shadow-2xl">
        <div className="px-8 py-6 border-b-2 border-text-primary flex items-center justify-between bg-bg-primary shrink-0">
          <div>
            <div className="text-2xl font-black text-text-primary uppercase tracking-tight">New List</div>
            <div className="text-xs font-mono text-text-secondary mt-1">Initialize Manual Preparation Queue</div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-text-primary hover:bg-text-primary hover:text-bg-primary transition-colors border border-transparent hover:border-text-primary"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6">
          {error && (
            <div className="p-3 border border-warning text-warning text-sm font-mono bg-warning/10">
              {error}
            </div>
          )}

          <div>
            <label className="label block mb-2">Collection Name *</label>
            <div className="relative">
              <Folder size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                required
                maxLength={50}
                placeholder="e.g. Meta Phone Screen, Failed Array Problems..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-system pl-10"
              />
            </div>
          </div>

          <div>
            <label className="label block mb-2">Description (Optional)</label>
            <textarea
              rows={3}
              placeholder="Add context or goals for this collection..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-system resize-y"
            />
          </div>

          <div className="flex justify-end gap-4 mt-2 pt-6 border-t border-border-strong">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!name.trim() || loading}
            >
              {loading ? 'CREATING...' : 'CREATE LIST'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
