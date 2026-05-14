export interface VirtualDocument {
  id: string;
  user_id: string;
  title: string;
  input_type: 'pdf' | 'image' | 'text';
  original_text: string;
  file_path: string | null;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

export interface VirtualTask {
  id: string;
  document_id: string;
  task_text: string;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'done';
  source_snippet: string | null;
}

export interface VirtualOutput {
  id: string;
  document_id: string;
  summary: string;
  draft_reply: string;
  raw_ai_json: any;
}

const STORAGE_KEY = 'proofdesk_virtual_db';

const getStore = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : { documents: [], tasks: [], outputs: [] };
};

const saveStore = (store: any) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

export const virtualDb = {
  createDocument: async (doc: Partial<VirtualDocument>): Promise<VirtualDocument> => {
    const store = getStore();
    const newDoc = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      status: 'uploaded',
      ...doc
    } as VirtualDocument;
    store.documents.push(newDoc);
    saveStore(store);
    return newDoc;
  },

  updateDocument: async (id: string, updates: Partial<VirtualDocument>) => {
    const store = getStore();
    store.documents = store.documents.map((d: any) => d.id === id ? { ...d, ...updates } : d);
    saveStore(store);
  },

  createOutput: async (output: Partial<VirtualOutput>) => {
    const store = getStore();
    const newOutput = { id: crypto.randomUUID(), ...output };
    store.outputs.push(newOutput);
    saveStore(store);
    return newOutput;
  },

  createTasks: async (tasks: Partial<VirtualTask>[]) => {
    const store = getStore();
    const newTasks = tasks.map(t => ({ id: crypto.randomUUID(), status: 'open', ...t }));
    store.tasks.push(...newTasks);
    saveStore(store);
    return newTasks;
  },

  getDocument: async (id: string) => {
    const store = getStore();
    return store.documents.find((d: any) => d.id === id) || null;
  },

  getOutput: async (docId: string) => {
    const store = getStore();
    return store.outputs.find((o: any) => o.document_id === docId) || null;
  },

  getTasks: async (docId: string) => {
    const store = getStore();
    return store.tasks.filter((t: any) => t.document_id === docId);
  }
};
