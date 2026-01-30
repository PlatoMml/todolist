
import React, { useCallback, useRef, useState } from 'react';

interface Options {
    shouldPreventDefault?: boolean;
    delay?: number;
}

export const useLongPress = (
    onLongPress: (e: React.TouchEvent | React.MouseEvent) => void,
    onClick: () => void,
    { shouldPreventDefault = true, delay = 500 }: Options = {}
) => {
    const [longPressTriggered, setLongPressTriggered] = useState(false);
    const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const targetRef = useRef<EventTarget | null>(null);

    const start = useCallback(
        (e: React.TouchEvent | React.MouseEvent) => {
            // Only trigger on left click or touch
            if (e.type === 'mousedown' && (e as React.MouseEvent).button !== 0) return;
            
            targetRef.current = e.target;
            setLongPressTriggered(false);
            
            timeout.current = setTimeout(() => {
                onLongPress(e);
                setLongPressTriggered(true);
            }, delay);
        },
        [onLongPress, delay]
    );

    const clear = useCallback(
        (e: React.TouchEvent | React.MouseEvent, shouldTriggerClick = true) => {
            if (timeout.current) {
                clearTimeout(timeout.current);
                timeout.current = null;
            }
            
            // If strictly a click (not a long press, and not scrolled away)
            if (shouldTriggerClick && !longPressTriggered && targetRef.current === e.target) {
                onClick();
            }
            
            setLongPressTriggered(false);
            targetRef.current = null;
        },
        [longPressTriggered, onClick]
    );

    return {
        onMouseDown: (e: React.MouseEvent) => start(e),
        onTouchStart: (e: React.TouchEvent) => start(e),
        onMouseUp: (e: React.MouseEvent) => clear(e),
        onMouseLeave: (e: React.MouseEvent) => clear(e, false),
        onTouchEnd: (e: React.TouchEvent) => clear(e),
        // If user drags/scrolls, cancel the long press
        onTouchMove: (e: React.TouchEvent) => clear(e, false), 
    };
};
