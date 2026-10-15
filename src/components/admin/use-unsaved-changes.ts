import { useEffect } from 'react';

/**
 * Warns before leaving the page while there are unsaved changes.
 *
 * Relies solely on the browser's native `beforeunload` dialog, which fires for
 * link navigations, form submits (e.g. "Cerrar sesión"), refresh, back and
 * close. A previous version also intercepted clicks with a custom
 * `window.confirm`, which produced two dialogs in a row — removed on purpose.
 */
export function useUnsavedChanges(dirty: boolean): void {
	useEffect(() => {
		if (!dirty) return;

		const onBeforeUnload = (e: BeforeUnloadEvent) => {
			e.preventDefault();
			// Legacy Safari needs `returnValue`; the property is deprecated in
			// newer DOM typings, so set it via a structural cast.
			(e as unknown as { returnValue: string }).returnValue = '';
		};

		window.addEventListener('beforeunload', onBeforeUnload);
		return () => window.removeEventListener('beforeunload', onBeforeUnload);
	}, [dirty]);
}
