import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Collection } from '../types';
import { Folder, Zap, Plus, Sparkles, AlertTriangle, Target } from 'lucide-react';
import { AddCollectionModal } from '../components/collections/AddCollectionModal';
import { Link } from 'react-router-dom';

export function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionTaskCounts, setCollectionTaskCounts] = useState<Record<string, number>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const collectionsRes = await supabase.from('collections').select('*').eq('user_id', user.id).order('created_at', { ascending: false });

      if (collectionsRes.error) console.error(collectionsRes.error);

      setCollections(collectionsRes.data || []);

      // Fetch Task Counts for Manual Collections
      const collectionIds = (collectionsRes.data || []).map(c => c.id);
      if (collectionIds.length > 0) {
        const { data: ctData } = await supabase.from('collection_tasks').select('collection_id').in('collection_id', collectionIds);
        if (ctData) {
          const counts: Record<string, number> = {};
          ctData.forEach(row => { counts[row.collection_id] = (counts[row.collection_id] || 0) + 1; });
          setCollectionTaskCounts(counts);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const manualCollections = collections.filter(c => c.type === 'manual');
  const smartCollections = collections.filter(c => c.type === 'smart' || c.type === 'ai');

  return (
    <div className="flex-1 w-full max-w-[1200px] mx-auto p-4 md:p-8 flex flex-col">
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-serif font-light tracking-tight mb-2 text-text-primary">
          Curated <span className="italic text-accent">Collections</span>
        </h1>
        <div className="text-sm font-mono text-text-secondary uppercase tracking-widest border-b-2 border-border-strong inline-block pb-1">
          Smart Preparation Lists
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* My Lists */}
          <section>
            <div className="flex items-center justify-between mb-4 border-b border-border-strong pb-2">
              <h2 className="label flex items-center gap-2">
                <Folder size={14} className="text-accent" />
                My Lists
              </h2>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
            
            <div className="flex flex-col gap-3">
              {manualCollections.length > 0 ? (
                manualCollections.map(list => (
                  <CollectionCard 
                    key={list.id} 
                    title={list.name} 
                    icon={<Folder size={16} />} 
                    count={collectionTaskCounts[list.id] || 0} 
                    to={`/collections/${list.id}`}
                  />
                ))
              ) : (
                <div className="empty-state py-8">
                  <div className="text-xs font-mono text-text-muted mb-3">No manual lists created.</div>
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="btn-secondary text-xs uppercase tracking-wider py-1.5 px-3"
                  >
                    Create List
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Smart Lists */}
          <section>
            <div className="flex items-center justify-between mb-4 border-b border-border-strong pb-2">
              <h2 className="label flex items-center gap-2">
                <Zap size={14} className="text-accent" />
                Smart Lists
              </h2>
            </div>
            
            <div className="flex flex-col gap-3">
              <CollectionCard title="Weak Patterns" icon={<AlertTriangle size={16} className="text-warning" />} count={0} isSmart to="/collections/weak-patterns" />
              <CollectionCard title="Quick Wins" icon={<Sparkles size={16} className="text-success" />} count={0} isSmart to="/collections/quick-wins" />
              
              {smartCollections.map(list => (
                <CollectionCard key={list.id} title={list.name} icon={<Target size={16} />} count={0} isSmart to={`/collections/${list.id}`} />
              ))}
            </div>
          </section>

        </div>

        <AddCollectionModal 
          isOpen={isAddModalOpen} 
          onClose={() => setIsAddModalOpen(false)} 
          onAdded={() => fetchData()} 
        />
    </div>
  );
}

function CollectionCard({ title, icon, count, isSmart, metadata, to }: { title: string, icon: React.ReactNode, count: number, isSmart?: boolean, metadata?: string, to: string }) {
  return (
    <Link to={to} className="panel p-4 flex items-center justify-between hover:border-accent transition-colors cursor-pointer group block">
      <div className="flex items-center gap-3">
        <div className="text-text-secondary group-hover:text-accent transition-colors">
          {icon}
        </div>
        <div className="text-sm font-semibold text-text-primary">{title}</div>
      </div>
      <div className="flex items-center gap-3">
        {metadata && <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider">{metadata}</div>}
        {isSmart && <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" title="Auto-updating" />}
        <div className="text-xs font-mono font-bold text-text-secondary bg-bg-tertiary px-2 py-0.5 rounded border border-border-subtle">
          {count}
        </div>
      </div>
    </Link>
  );
}
