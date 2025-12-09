
// Simplified use-toast for build success
import * as React from "react"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = any // Generic for now

let count = 0

function genId() {
    count = (count + 1) % Number.MAX_SAFE_INTEGER
    return count.toString()
}

type ToastActionElement = React.ReactElement

type ToastProps = {
    id?: string
    title?: React.ReactNode
    description?: React.ReactNode
    action?: ToastActionElement
    variant?: "default" | "destructive"
}

const listeners: Array<(state: any) => void> = []

let memoryState = {
    toasts: [] as any[],
}

function dispatch(action: any) {
    memoryState = reducer(memoryState, action)
    listeners.forEach((listener) => {
        listener(memoryState)
    })
}

const reducer = (state: any, action: any) => {
    switch (action.type) {
        case "ADD_TOAST":
            return {
                ...state,
                toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
            }
        case "UPDATE_TOAST":
            return {
                ...state,
                toasts: state.toasts.map((t: any) =>
                    t.id === action.toast.id ? { ...t, ...action.toast } : t
                ),
            }
        case "DISMISS_TOAST":
            return {
                ...state,
                toasts: state.toasts.filter((t: any) => t.id !== action.toastId),
            }
        case "REMOVE_TOAST":
            if (action.toastId === undefined) {
                return {
                    ...state,
                    toasts: [],
                }
            }
            return {
                ...state,
                toasts: state.toasts.filter((t: any) => t.id !== action.toastId),
            }
    }
    return state
}

function toast({ ...props }: ToastProps) {
    const id = genId()

    const update = (props: ToasterToast) =>
        dispatch({
            type: "UPDATE_TOAST",
            toast: { ...props, id },
        })
    const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

    dispatch({
        type: "ADD_TOAST",
        toast: {
            ...props,
            id,
            open: true,
            onOpenChange: (open: boolean) => {
                if (!open) dismiss()
            },
        },
    })

    return {
        id: id,
        dismiss,
        update,
    }
}

function useToast() {
    const [state, setState] = React.useState<any>(memoryState)

    React.useEffect(() => {
        listeners.push(setState)
        return () => {
            const index = listeners.indexOf(setState)
            if (index > -1) {
                listeners.splice(index, 1)
            }
        }
    }, [state])

    return {
        ...state,
        toast,
        dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
    }
}

export { useToast, toast }
