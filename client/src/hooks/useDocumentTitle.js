import { useEffect } from 'react';

const APP_NAME = 'E-Medico';

/** Give each route its own browser tab title, which screen readers announce on navigation. */
export default function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${APP_NAME}` : `${APP_NAME}: find a doctor and book online`;
  }, [title]);
}
