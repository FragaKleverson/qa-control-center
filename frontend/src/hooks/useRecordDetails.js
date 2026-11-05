import { useEffect, useMemo, useState } from "react";
import { createRecordViewer } from "../domain/recordDetails";

export default function useRecordDetails(fetchRecord) {
  const [state, setState] = useState({ selected: null, record: null, loading: false, error: "" });
  const viewer = useMemo(() => createRecordViewer(fetchRecord, setState), [fetchRecord]);
  useEffect(() => () => viewer.cancel(), [viewer]);
  return { ...state, ...viewer };
}
