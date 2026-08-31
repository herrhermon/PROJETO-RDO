import { useState } from 'react';
import { api, ApiError } from '../lib/apiClient';

interface HasId {
  id: number;
}

// Drag-to-reorder for RDO item tables. Rows move optimistically so the drag feels
// immediate, then the new order is persisted; a failed save rolls back to the
// server's list rather than leaving the screen out of sync with the database.
export function useRowReorder<T extends HasId>(
  items: T[],
  setItems: (rows: T[]) => void,
  endpoint: string,
  onError: (msg: string) => void
) {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);

  function handleDragStart(id: number) {
    setDraggingId(id);
  }

  function handleDragOver(e: React.DragEvent, id: number) {
    e.preventDefault();
    if (id !== overId) setOverId(id);
  }

  async function handleDrop(targetId: number) {
    const sourceId = draggingId;
    setDraggingId(null);
    setOverId(null);
    if (sourceId === null || sourceId === targetId) return;

    const from = items.findIndex((i) => i.id === sourceId);
    const to = items.findIndex((i) => i.id === targetId);
    if (from === -1 || to === -1) return;

    const previous = items;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);

    try {
      await api.put(endpoint, { ids: next.map((i) => i.id) });
    } catch (err) {
      setItems(previous);
      onError(err instanceof ApiError ? err.message : 'Não foi possível salvar a nova ordem.');
    }
  }

  function handleDragEnd() {
    setDraggingId(null);
    setOverId(null);
  }

  // Spread onto each <tr> to make it draggable and give visual feedback.
  function rowProps(id: number) {
    return {
      draggable: true,
      onDragStart: () => handleDragStart(id),
      onDragOver: (e: React.DragEvent) => handleDragOver(e, id),
      onDrop: () => handleDrop(id),
      onDragEnd: handleDragEnd,
      className: [
        'transition-colors',
        draggingId === id ? 'opacity-40' : '',
        overId === id && draggingId !== id ? 'bg-blue-50 border-t-2 border-eqc-900' : '',
      ]
        .filter(Boolean)
        .join(' '),
    };
  }

  return { rowProps, draggingId };
}
