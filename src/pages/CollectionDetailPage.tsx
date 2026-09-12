import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { Collection, Task } from '../types';
import { Folder, ArrowLeft, Zap, Sparkles, AlertTriangle } from 'lucide-react';
import { TaskRow } from '../components/dashboard/TaskRow';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import { AddToCollectionModal } from '../components/collections/AddToCollectionModal';

export function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>(); // can be a UUID or 'weak-patterns' or 'quick-wins'
  const [collection, setCollection] = useState<Collection | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [addToCollectionTaskId, setAddToCollectionTaskId] = useState<string | null>(null);

  const isSmart = id === 'weak-patterns' || id === 'quick-wins';

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (isSmart) {
        // Smart Lists Logic
        if (id === 'quick-wins') {
          setCollection({
            id: 'quick-wins',
            name: 'Quick Wins',
            description: 'High priority tasks that take less than 30 minutes.',
            type: 'smart',
            user_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            rules: {}
          });
          
          const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .lt('effort_estimate_mins', 30)
            .gte('priority', 4)
            .neq('status', 'done')
            .order('priority', { ascending: false });
          if (error) throw error;
          setTasks(data || []);

        } else if (id === 'weak-patterns') {
          setCollection({
            id: 'weak-patterns',
            name: 'Weak Patterns',
            description: 'Tasks from domains where your readiness score is lowest.',
            type: 'smart',
            user_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            rules: {}
          });

          // Get weakest domain
          const { data: statsData } = await supabase.from('stats').select('*').eq('user_id', user.id).order('level', { ascending: true }).order('current_exp', { ascending: true }).limit(1);
          
          let query = supabase.from('tasks').select('*').eq('user_id', user.id).neq('status', 'done');
          if (statsData && statsData.length > 0) {
            query = query.eq('domain', statsData[0].domain);
          }
          const { data, error } = await query.order('priority', { ascending: false });
          if (error) throw error;
          setTasks(data || []);
        }
      } else {
        // Manual List Logic
        const { data: colData, error: colError } = await supabase
          .from('collections')
          .select('*')
          .eq('id', id)
          .single();
        if (colError) throw colError;
        setCollection(colData);

        const { data: ctData, error: ctError } = await supabase
          .from('collection_tasks')
          .select('task_id')
          .eq('collection_id', id);
        
        if (ctError) throw ctError;
        
        if (ctData && ctData.length > 0) {
          const taskIds = ctData.map(c => c.task_id);
          const { data: tasksData, error: tasksError } = await supabase
            .from('tasks')
            .select('*')
            .in('id', taskIds);
            
          if (tasksError) throw tasksError;
          
          // Apply custom ordering from rules if present
          let finalTasks = tasksData || [];
          if (colData.rules && Array.isArray(colData.rules.order)) {
            const orderList = colData.rules.order as string[];
            const orderMap = new Map<string, number>(orderList.map((taskId: string, index: number) => [taskId, index]));
            finalTasks.sort((a, b) => {
              const orderA = orderMap.has(a.id) ? (orderMap.get(a.id) as number) : 999999;
              const orderB = orderMap.has(b.id) ? (orderMap.get(b.id) as number) : 999999;
              return orderA - orderB;
            });
          }
          setTasks(finalTasks);
        } else {
          setTasks([]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (isSmart || !collection) return; // Smart lists cannot be manually reordered

    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);

      const newTasks = [...tasks];
      const [movedItem] = newTasks.splice(oldIndex, 1);
      newTasks.splice(newIndex, 0, movedItem);

      setTasks(newTasks);

      // Persist order in collection rules
      const newOrder = newTasks.map(t => t.id);
      const newRules = { ...(collection.rules || {}), order: newOrder };
      
      // Update local state to keep in sync
      setCollection({ ...collection, rules: newRules });

      await supabase
        .from('collections')
        .update({ rules: newRules })
        .eq('id', collection.id);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 w-full max-w-[1200px] mx-auto p-4 md:p-8 flex justify-center py-20">
        <div className="label animate-pulse">Loading Collection...</div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="flex-1 w-full max-w-[1200px] mx-auto p-4 md:p-8 flex flex-col items-center justify-center">
        <div className="text-xl font-bold mb-4">Collection Not Found</div>
        <Link to="/collections" className="btn-secondary">Return to Collections</Link>
      </div>
    );
  }

  const getIcon = () => {
    if (id === 'quick-wins') return <Sparkles size={32} className="text-success" />;
    if (id === 'weak-patterns') return <AlertTriangle size={32} className="text-warning" />;
    if (isSmart) return <Zap size={32} className="text-accent" />;
    return <Folder size={32} className="text-text-primary" />;
  };

  return (
    <div className="flex-1 w-full max-w-[1200px] mx-auto p-4 md:p-8 flex flex-col gap-8 pb-32">
      <div className="flex items-start justify-between">
        <div>
          <Link to="/collections" className="text-xs font-mono text-text-muted hover:text-text-primary mb-4 inline-flex items-center gap-2 transition-colors">
            <ArrowLeft size={12} /> BACK TO COLLECTIONS
          </Link>
          <div className="flex items-center gap-4 mt-2">
            <div className="w-16 h-16 bg-bg-secondary border-2 border-border-strong rounded flex items-center justify-center">
              {getIcon()}
            </div>
            <div>
              <h1 className="text-4xl font-black text-text-primary uppercase tracking-tight">{collection.name}</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-secondary border border-border-strong px-2 py-0.5 rounded bg-bg-primary">
                  {collection.type} list
                </span>
              </div>
            </div>
          </div>
          {collection.description && (
            <p className="mt-6 text-sm text-text-secondary max-w-2xl">{collection.description}</p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <h2 className="text-xl font-bold tracking-tight mb-6 uppercase border-b-2 border-border-strong pb-2 flex items-center justify-between">
          <span>Queue</span>
          <span className="text-xs font-mono text-text-muted">{tasks.length} items</span>
        </h2>

        {tasks.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
          >
            <div className="flex flex-col border border-border-strong bg-bg-primary shadow-sm rounded-sm overflow-hidden">
              <div className="grid grid-cols-[12px_1fr_100px_80px_100px_80px] gap-4 p-3 border-b border-border-strong bg-bg-secondary text-[10px] font-mono text-text-muted uppercase tracking-widest font-semibold items-center">
                <div /> {/* Drag Handle Space */}
                <div>Operation</div>
                <div>Domain</div>
                <div>Status</div>
                <div>Deadline</div>
                <div className="text-right">Priority</div>
              </div>
              
              <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="divide-y divide-border-subtle bg-bg-primary">
                  {tasks.map((task) => (
                    <TaskRow 
                      key={task.id} 
                      task={task} 
                      aiScore={task.ai_score} 
                      isManualMode={!isSmart} // Allow dragging only in manual mode
                      onAddToCollection={setAddToCollectionTaskId}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          </DndContext>
        ) : (
          <div className="empty-state py-16 text-center border-2 border-dashed border-border-strong">
            <div className="text-sm font-bold text-text-primary mb-2">Queue is empty</div>
            <div className="text-xs font-mono text-text-muted max-w-sm mx-auto">
              {isSmart 
                ? "No tasks currently match this smart filter." 
                : "Add tasks to this collection from the dashboard menu."}
            </div>
          </div>
        )}
      </div>

      <AddToCollectionModal
        taskId={addToCollectionTaskId}
        onClose={() => setAddToCollectionTaskId(null)}
      />
    </div>
  );
}
