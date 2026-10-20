import { useEffect, useRef, type RefObject } from 'react';

/** Cierra un <dialog> modal al pulsar o tocar sobre el fondo oscuro (fuera de su caja). */
export function useBackdropClose(
    ref: RefObject<HTMLDialogElement | null>,
    onClose: () => void,
    disabled = false,
) {
    const onCloseRef = useRef(onClose);
    const disabledRef = useRef(disabled);
    useEffect(() => { onCloseRef.current = onClose; disabledRef.current = disabled; });

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        let downOutside = false;
        const outside = (event: PointerEvent): boolean => {
            const box = dialog.getBoundingClientRect();
            return event.clientX < box.left || event.clientX > box.right
                || event.clientY < box.top || event.clientY > box.bottom;
        };
        // Solo cierra si el gesto empezó y terminó fuera (evita cierres al seleccionar texto).
        const down = (event: PointerEvent) => { downOutside = outside(event); };
        const up = (event: PointerEvent) => {
            if (downOutside && outside(event) && !disabledRef.current) onCloseRef.current();
            downOutside = false;
        };
        dialog.addEventListener('pointerdown', down);
        dialog.addEventListener('pointerup', up);
        return () => { dialog.removeEventListener('pointerdown', down); dialog.removeEventListener('pointerup', up); };
    }, [ref]);
}