import { useEffect } from "react";

const BASE_TITLE = "Avarta AP Workspace";
const DEFAULT_DESC =
  "Institutional Accounts Payable & Financial Operations Workstation for high-velocity finance teams, controllers, and CFOs.";

export function useDocumentTitle(title?: string, description?: string) {
  useEffect(() => {
    const previousTitle = document.title;
    const finalTitle = title ? `${title} | ${BASE_TITLE}` : BASE_TITLE;
    document.title = finalTitle;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    const previousDesc = metaDesc.getAttribute("content") || DEFAULT_DESC;
    metaDesc.setAttribute("content", description || DEFAULT_DESC);

    return () => {
      document.title = previousTitle;
      metaDesc?.setAttribute("content", previousDesc);
    };
  }, [title, description]);
}
