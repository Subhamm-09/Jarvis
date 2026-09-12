import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Activity, X, BrainCircuit, AlertTriangle, XCircle } from 'lucide-react';

interface LeetcodeAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LeetcodeAnalysisModal({ isOpen, onClose }: LeetcodeAnalysisModalProps) {
  const [loading, setLoading] = useState(true);
  const [remembered, setRemembered] = useState<string[]>([]);
  const [struggled, setStruggled] = useState<string[]>([]);
  const [forgot, setForgot] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all completed revisions
      const { data, error } = await supabase
        .from('tasks')
        .select('title, metadata, updated_at')
        .eq('user_id', user.id)
        .eq('domain', 'leetcode')
        .eq('status', 'done')
        .not('metadata->recall_result', 'is', 'null')
        .order('updated_at', { ascending: false });

      if (error || !data) {
        setLoading(false);
        return;
      }

      // Group by original_task_id to keep only the latest result per problem
      const latestResults = new Map<string, any>();
      
      data.forEach(task => {
        const originalId = task.metadata?.original_task_id;
        if (originalId && !latestResults.has(originalId)) {
           latestResults.set(originalId, {
             title: task.title.replace('🔄 Revision — ', ''),
             recall: task.metadata.recall_result
           });
        }
      });

      const easyList: string[] = [];
      const struggledList: string[] = [];
      const forgotList: string[] = [];

      latestResults.forEach((val) => {
        if (val.recall === 'easy') easyList.push(val.title);
        else if (val.recall === 'struggled') struggledList.push(val.title);
        else if (val.recall === 'forgot') forgotList.push(val.title);
      });

      setRemembered(easyList);
      setStruggled(struggledList);
      setForgot(forgotList);
      setLoading(false);
    };

    fetchData();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[60] bg-bg-primary/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-bg-secondary border-2 border-text-primary w-full max-w-4xl max-h-[85vh] flex flex-col shadow-[8px_8px_0_0_var(--color-text-primary)]">
        
        <div className="px-8 py-6 border-b-2 border-text-primary flex items-center justify-between bg-bg-primary shrink-0">
          <div className="flex items-center gap-3 text-text-primary font-black uppercase tracking-tight text-xl">
            <Activity size={20} /> Tactical LeetCode Analysis
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-text-primary hover:bg-text-primary hover:text-bg-primary transition-colors border border-transparent hover:border-text-primary">
            <X size={18} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-20">
               <div className="text-sm font-mono text-text-muted uppercase tracking-widest">Compiling metrics...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Remembered Box */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b-2 border-success text-success">
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-sm">
                    <BrainCircuit size={16} /> Remembers
                  </div>
                  <span className="font-mono font-bold">{remembered.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {remembered.length === 0 ? (
                    <div className="text-xs font-mono text-text-muted italic">No data yet</div>
                  ) : (
                    remembered.map((title, i) => (
                      <div key={i} className="text-xs font-mono font-semibold text-success bg-success-muted border border-success p-3 truncate">
                        {title}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Struggled Box */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b-2 border-text-primary text-text-primary">
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-sm">
                    <AlertTriangle size={16} /> Struggled
                  </div>
                  <span className="font-mono font-bold">{struggled.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {struggled.length === 0 ? (
                    <div className="text-xs font-mono text-text-muted italic">No data yet</div>
                  ) : (
                    struggled.map((title, i) => (
                      <div key={i} className="text-xs font-mono font-semibold text-text-primary bg-bg-tertiary border border-border-strong p-3 truncate">
                        {title}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Forgot Box */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b-2 border-accent text-accent">
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-sm">
                    <XCircle size={16} /> Forgot
                  </div>
                  <span className="font-mono font-bold">{forgot.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {forgot.length === 0 ? (
                    <div className="text-xs font-mono text-text-muted italic">No data yet</div>
                  ) : (
                    forgot.map((title, i) => (
                      <div key={i} className="text-xs font-mono font-semibold text-accent bg-accent-muted border border-accent p-3 truncate">
                        {title}
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
