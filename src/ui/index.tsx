import React, { StrictMode, useState, useEffect, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import { IComponent, getStudioProApi, ComponentContext } from "@mendix/extensions-api";
import * as monaco from "monaco-editor";

// Configure Monaco Editor to work without web workers (simpler setup)
// This disables some features like syntax validation but keeps syntax highlighting
(self as any).MonacoEnvironment = {
    getWorker: function () {
        return null;
    },
};

interface JavaEditorProps {
    filePath: string;
    actionName: string;
    moduleName: string;
    componentContext: ComponentContext;
}

function JavaEditor({ filePath, actionName, moduleName, componentContext }: JavaEditorProps) {
    const [originalContent, setOriginalContent] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [lineCount, setLineCount] = useState(0);
    const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
    
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const originalContentRef = useRef<string>("");

    const studioPro = getStudioProApi(componentContext);

    // Initialize Monaco Editor
    useEffect(() => {
        if (!editorContainerRef.current || isLoading) return;

        const editor = monaco.editor.create(editorContainerRef.current, {
            value: originalContent,
            language: "java",
            theme: "vs-dark",
            automaticLayout: true,
            minimap: { enabled: true },
            fontSize: 14,
            fontFamily: "monospace",
            lineNumbers: "on",
            renderLineHighlight: "all",
            scrollBeyondLastLine: false,
            wordWrap: "off",
            tabSize: 4,
            insertSpaces: true,
            formatOnPaste: true,
            formatOnType: true,
            folding: true,
            bracketPairColorization: { enabled: true },
            guides: {
                bracketPairs: true,
                indentation: true,
            },
            smoothScrolling: true,
            cursorBlinking: "blink",
            cursorSmoothCaretAnimation: "off",
            padding: { top: 10, bottom: 10 },
            // Fix for click position issues
            disableMonospaceOptimizations: false,
            stopRenderingLineAfter: -1,
            fixedOverflowWidgets: true,
        });

        editorRef.current = editor;
        originalContentRef.current = originalContent;

        // Force layout recalculation after a short delay to fix click positioning
        setTimeout(() => {
            editor.layout();
        }, 100);

        // Track content changes
        editor.onDidChangeModelContent(() => {
            const currentContent = editor.getValue();
            setIsDirty(currentContent !== originalContentRef.current);
            setLineCount(editor.getModel()?.getLineCount() || 0);
        });

        // Track cursor position
        editor.onDidChangeCursorPosition((e) => {
            setCursorPosition({ line: e.position.lineNumber, column: e.position.column });
        });

        // Set initial line count
        setLineCount(editor.getModel()?.getLineCount() || 0);

        // Add save command (Ctrl+S / Cmd+S)
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            const saveButton = document.getElementById("save-button");
            if (saveButton && !saveButton.hasAttribute("disabled")) {
                saveButton.click();
            }
        });

        // Focus the editor so cursor is visible
        editor.focus();

        return () => {
            editor.dispose();
        };
    }, [isLoading, originalContent]);

    // Load the Java file content
    useEffect(() => {
        const loadFile = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                // Directly use the Files API from the UI entry point
                const content = await studioPro.app.files.getFile(filePath);
                setOriginalContent(content);
                setIsDirty(false);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
                const isFileNotFound = errorMessage.toLowerCase().includes("not found") || 
                                       errorMessage.toLowerCase().includes("does not exist") ||
                                       errorMessage.toLowerCase().includes("no such file");
                
                const helpfulError = isFileNotFound
                    ? `Java source file not found: ${filePath}\n\nThe Java file has not been generated yet. Please deploy to Eclipse first (F6) to generate the Java source files.`
                    : errorMessage;
                
                setError(helpfulError);
            } finally {
                setIsLoading(false);
            }
        };

        loadFile();
    }, [filePath]);

    // Save the file
    const handleSave = useCallback(async () => {
        if (!editorRef.current) return;
        
        const content = editorRef.current.getValue();
        setIsSaving(true);
        setError(null);

        try {
            // Directly use the Files API from the UI entry point
            await studioPro.app.files.putFile(filePath, content);
            setOriginalContent(content);
            originalContentRef.current = content;
            setIsDirty(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save file");
        } finally {
            setIsSaving(false);
        }
    }, [filePath]);

    if (isLoading) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>
                    <div style={styles.loadingSpinner}></div>
                    <span>Loading {filePath}...</span>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={styles.fileInfo}>
                    <span style={styles.fileName}>
                        ☕ {actionName}.java
                        {isDirty && <span style={styles.dirtyIndicator}> •</span>}
                    </span>
                    <span style={styles.filePath}>{moduleName}/actions/{actionName}.java</span>
                </div>
                <div style={styles.actions}>
                    <button
                        id="save-button"
                        style={{
                            ...styles.button,
                            ...(isDirty && !isSaving ? styles.buttonPrimary : styles.buttonDisabled)
                        }}
                        onClick={handleSave}
                        disabled={!isDirty || isSaving}
                    >
                        {isSaving ? "Saving..." : "Save (Ctrl+S)"}
                    </button>
                </div>
            </div>
            
            {error && (
                <div style={styles.error}>
                    ⚠️ {error}
                </div>
            )}

            <div 
                ref={editorContainerRef} 
                style={styles.editorContainer}
            />
            
            <div style={styles.statusBar}>
                <div style={styles.statusLeft}>
                    <span>Java</span>
                    <span style={styles.statusSeparator}>|</span>
                    <span>UTF-8</span>
                </div>
                <div style={styles.statusRight}>
                    <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
                    <span style={styles.statusSeparator}>|</span>
                    <span>{lineCount} lines</span>
                </div>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#1e1e1e",
        color: "#d4d4d4",
        fontFamily: "system-ui, -apple-system, sans-serif",
        overflow: "hidden",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 16px",
        backgroundColor: "#252526",
        borderBottom: "1px solid #3c3c3c",
        flexShrink: 0,
    },
    fileInfo: {
        display: "flex",
        flexDirection: "column",
        gap: "2px",
    },
    fileName: {
        fontSize: "14px",
        fontWeight: 600,
        color: "#ffffff",
    },
    filePath: {
        fontSize: "11px",
        color: "#808080",
    },
    dirtyIndicator: {
        color: "#ffffff",
        fontWeight: "bold",
    },
    actions: {
        display: "flex",
        gap: "8px",
    },
    button: {
        padding: "6px 16px",
        border: "none",
        borderRadius: "4px",
        fontSize: "13px",
        cursor: "pointer",
        fontWeight: 500,
        transition: "background-color 0.2s",
    },
    buttonPrimary: {
        backgroundColor: "#0e639c",
        color: "#ffffff",
    },
    buttonDisabled: {
        backgroundColor: "#3c3c3c",
        color: "#6c6c6c",
        cursor: "not-allowed",
    },
    error: {
        padding: "8px 16px",
        backgroundColor: "#5a1d1d",
        color: "#f48771",
        fontSize: "13px",
        flexShrink: 0,
    },
    editorContainer: {
        flex: 1,
        overflow: "hidden",
    },
    statusBar: {
        display: "flex",
        justifyContent: "space-between",
        padding: "4px 16px",
        backgroundColor: "#007acc",
        color: "#ffffff",
        fontSize: "12px",
        flexShrink: 0,
    },
    statusLeft: {
        display: "flex",
        gap: "8px",
        alignItems: "center",
    },
    statusRight: {
        display: "flex",
        gap: "8px",
        alignItems: "center",
    },
    statusSeparator: {
        opacity: 0.6,
    },
    loading: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        fontSize: "14px",
        color: "#808080",
        gap: "16px",
    },
    loadingSpinner: {
        width: "32px",
        height: "32px",
        border: "3px solid #3c3c3c",
        borderTop: "3px solid #007acc",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
    },
};

// Add keyframe animation for spinner and fix layout
const styleSheet = document.createElement("style");
styleSheet.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    /* Ensure root fills the container */
    html, body, #root {
        margin: 0 !important;
        padding: 0 !important;
        height: 100% !important;
        width: 100% !important;
        overflow: hidden !important;
        position: relative !important;
    }
    
    /* Hide ALL textareas except Monaco's internal one */
    textarea {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
        opacity: 0 !important;
        pointer-events: none !important;
    }
    
    /* But allow Monaco's textarea to work (it's used for input) */
    .monaco-editor textarea.inputarea {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        opacity: 0 !important;
        pointer-events: auto !important;
    }
`;
document.head.appendChild(styleSheet);

// Remove any non-Monaco textareas from DOM
function removeUnwantedTextareas() {
    document.querySelectorAll('textarea').forEach(ta => {
        if (!ta.classList.contains('inputarea') && !ta.closest('.monaco-editor')) {
            ta.remove();
        }
    });
}

// Run immediately
removeUnwantedTextareas();

// Watch for any new textareas being added
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
                if (node instanceof HTMLTextAreaElement) {
                    if (!node.classList.contains('inputarea') && !node.closest?.('.monaco-editor')) {
                        node.remove();
                    }
                }
            });
        }
    }
});

observer.observe(document.body, { childList: true, subtree: true });

export const component: IComponent = {
    async loaded(componentContext: ComponentContext) {
        // Remove any default textarea elements that the framework might inject
        document.querySelectorAll('textarea').forEach(ta => {
            if (!ta.classList.contains('inputarea') && !ta.closest('.monaco-editor')) {
                ta.remove();
            }
        });

        // Parse query parameters from URL
        const urlParams = new URLSearchParams(window.location.search);
        const filePath = urlParams.get("filePath") || "";
        const actionName = urlParams.get("actionName") || "Unknown";
        const moduleName = urlParams.get("moduleName") || "Unknown";

        createRoot(document.getElementById("root")!).render(
            <StrictMode>
                <JavaEditor
                    filePath={filePath}
                    actionName={actionName}
                    moduleName={moduleName}
                    componentContext={componentContext}
                />
            </StrictMode>
        );
    }
};
