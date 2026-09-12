import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PriorityPanel } from './PriorityPanel';

export function SortablePriorityPanel(props: any) {
  if (!props.task) {
    return <PriorityPanel {...props} />;
  }

  return <SortablePriorityPanelInner {...props} />;
}

function SortablePriorityPanelInner(props: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.task.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: transition || 'transform 250ms cubic-bezier(0.2, 0, 0, 1)',
    zIndex: isDragging ? 50 : 1,
    position: 'relative' as const,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners} 
      className={isDragging ? 'cursor-grabbing shadow-2xl scale-[1.02] ring-2 ring-accent' : 'cursor-grab hover:ring-1 hover:ring-accent transition-all'}
    >
       <PriorityPanel {...props} />
    </div>
  );
}
