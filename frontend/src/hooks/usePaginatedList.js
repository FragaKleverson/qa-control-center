import { useCallback, useEffect, useRef, useState } from "react";
import { parsePaginationResponse } from "../services/api";

export default function usePaginatedList(list, initialQuery = {}) {
  const [request, setRequest] = useState(() => ({ page: 1, pageSize: 20, revision: 0, query: initialQuery }));
  const [result, setResult] = useState(null);
  const controllerRef = useRef(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    async function load() {
      try {
        const response = await list(
          { ...request.query, page: request.page, limit: request.pageSize },
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        const { data, total } = parsePaginationResponse(response);
        const lastPage = Math.max(Math.ceil(total / request.pageSize), 1);
        if (request.page > lastPage) {
          // Não publica uma página vazia enquanto corrige o número da página.
          setRequest((current) => ({ ...current, page: lastPage }));
          return;
        }
        const pageData = Array.isArray(response)
          ? data.slice((request.page - 1) * request.pageSize, request.page * request.pageSize)
          : data;
        setResult({ request, data: pageData, total, error: "" });
      } catch (error) {
        if (controller.signal.aborted) return;
        setResult({ request, data: [], total: 0, error: error.message || "Erro ao carregar registros" });
      }
    }
    load();
    return () => controller.abort();
  }, [list, request]);

  const setPage = useCallback((page) => {
    if (!mounted.current) return;
    controllerRef.current?.abort();
    setRequest((current) => ({ ...current, page }));
  }, []);

  const setPageSize = useCallback((pageSize) => {
    if (!mounted.current) return;
    controllerRef.current?.abort();
    setRequest((current) => ({ ...current, page: 1, pageSize }));
  }, []);

  const reload = useCallback(() => {
    if (!mounted.current) return;
    controllerRef.current?.abort();
    setRequest((current) => ({ ...current, revision: current.revision + 1 }));
  }, []);

  const setQuery = useCallback((query) => {
    if (!mounted.current) return;
    controllerRef.current?.abort();
    setRequest((current) => ({ ...current, page: 1, query }));
  }, []);

  const isLoading = result?.request !== request;
  return {
    data: isLoading ? [] : result.data,
    total: isLoading ? 0 : result.total,
    error: isLoading ? "" : result.error,
    isLoading,
    page: request.page,
    pageSize: request.pageSize,
    query: request.query,
    setQuery,
    setPage,
    setPageSize,
    reload,
    mounted,
  };
}
