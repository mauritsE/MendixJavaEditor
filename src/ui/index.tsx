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

interface JavaEditorMessage {
    type: "openJavaFile" | "saveJavaFile" | "getJavaFile";
    filePath?: string;
    content?: string;
    javaActionName?: string;
    moduleName?: string;
}

interface JavaEditorResponse {
    type: "javaFileContent" | "saveResult" | "error";
    content?: string;
    filePath?: string;
    success?: boolean;
    error?: string;
}

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
            fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
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
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            padding: { top: 10, bottom: 10 },
        });

        editorRef.current = editor;
        originalContentRef.current = originalContent;

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
                await studioPro.ui.messagePassing.sendMessage<JavaEditorMessage, JavaEditorResponse>(
                    { type: "getJavaFile", filePath },
                    async (response) => {
                        if (response.type === "javaFileContent" && response.content !== undefined) {
                            setOriginalContent(response.content);
                            setIsDirty(false);
                        } else if (response.type === "error") {
                            setError(response.error || "Failed to load file");
                        }
                        setIsLoading(false);
                    }
                );
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load file");
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
            await studioPro.ui.messagePassing.sendMessage<JavaEditorMessage, JavaEditorResponse>(
                { type: "saveJavaFile", filePath, content },
                async (response) => {
                    if (response.type === "saveResult" && response.success) {
                        setOriginalContent(content);
                        originalContentRef.current = content;
                        setIsDirty(false);
                    } else if (response.type === "error") {
                        setError(response.error || "Failed to save file");
                    }
                    setIsSaving(false);
                }
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save file");
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

// Add keyframe animation for spinner
const styleSheet = document.createElement("style");
styleSheet.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(styleSheet);

export const component: IComponent = {
    async loaded(componentContext: ComponentContext) {
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
