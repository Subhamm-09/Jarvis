import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import type { Collection } from '../../types';

interface AddToCollectionModalProps {
  taskId: string | null;
  onClose: () => void;
}

export function AddToCollectionModal({ taskId, onClose }: AddToCollectionModalProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [linkedCollectionIds, setLinkedCollectionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (taskId) {
      fetchData();
    }
  }, [taskId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [colsRes, linksRes] = await Promise.all([
        supabase.from('collections').select('*').eq('user_id', user.id).eq('type', 'manual').order('name'),
        supabase.from('collection_tasks').select('collection_id').eq('task_id', taskId)
      ]);

      setCollections(colsRes.data || []);
      setLinkedCollectionIds(new Set((linksRes.data || []).map(l => l.collection_id)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (collectionId: string, isLinked: boolean) => {
    if (!taskId) return;
    setProcessing(true);
    try {
      if (isLinked) {
        await supabase.from('collection_tasks').delete().eq('task_id', taskId).eq('collection_id', collectionId);
        setLinkedCollectionIds(prev => {
          const next = new Set(prev);
          next.delete(collectionId);
          return next;
        });
      } else {
        await supabase.from('collection_tasks').insert({ task_id: taskId, collection_id: collectionId });
        setLinkedCollectionIds(prev => {
          const next = new Set(prev);
          next.add(collectionId);
          return next;
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  if (!taskId) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-bg-primary/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-bg-secondary border-2 border-text-primary w-full max-w-sm flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b-2 border-text-primary flex items-center justify-between bg-bg-primary">
          <div className="text-lg font-black text-text-primary uppercase tracking-tight">Add to List</div>
          <button onClick={onClose} className="hover:text-text-primary text-text-muted"><X size={16} /></button>
        </div>

        <div className="p-6 flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="text-xs font-mono text-text-muted">Loading...</div>
          ) : collections.length > 0 ? (
            collections.map(c => {
              const isLinked = linkedCollectionIds.has(c.id);
              return (
                <button
                  key={c.id}
                  disabled={processing}
                  onClick={() => handleToggle(c.id, isLinked)}
                  className={`flex items-center justify-between p-3 border text-left transition-colors ${
                    isLinked ? 'border-accent bg-accent/10' : 'border-border-strong hover:border-text-primary'
                  }`}
                >
                  <span className={`text-sm font-bold ${isLinked ? 'text-accent' : 'text-text-primary'}`}>
                    {c.name}
                  </span>
                  {isLinked && <Check size={16} className="text-accent" />}
                </button>
              );
            })
          ) : (
            <div className="text-xs font-mono text-text-muted">No manual lists available. Create one in the Collections page.</div>
          )}
        </div>
      </div>
    </div>
  );
}
