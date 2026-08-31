import { useEffect, useState } from 'react';
import { api } from '../lib/apiClient';
import type { CatalogItem } from '../lib/types';

export function useCatalog(projectId: number) {
  const [funcoes, setFuncoes] = useState<CatalogItem[]>([]);
  const [empresas, setEmpresas] = useState<CatalogItem[]>([]);

  function load() {
    api.get<{ funcoes: CatalogItem[] }>(`/projects/${projectId}/funcoes`).then((r) => setFuncoes(r.funcoes));
    api.get<{ empresas: CatalogItem[] }>(`/projects/${projectId}/empresas`).then((r) => setEmpresas(r.empresas));
  }

  useEffect(load, [projectId]);

  return { funcoes, empresas, reload: load };
}
