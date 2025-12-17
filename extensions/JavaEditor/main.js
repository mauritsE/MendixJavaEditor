import {
  s
} from "./chunk-3OMKR3A7.js";
import "./chunk-G3PMV62Z.js";

// src/main/index.ts
var studioPro;
var component = {
  async loaded(componentContext) {
    studioPro = s(componentContext);
    await studioPro.ui.appExplorer.addContextMenu(
      {
        menuId: "JavaEditor.OpenEditor",
        caption: "Edit Java Source",
        action: async () => {
          const activeDoc = await studioPro.ui.editors.getActiveDocument();
          if (activeDoc && activeDoc.documentName && activeDoc.moduleName) {
            await openJavaEditorTab(activeDoc.documentName, activeDoc.moduleName);
          }
        }
      },
      "JavaActions$JavaAction"
    );
    await studioPro.ui.extensionsMenu.add({
      menuId: "JavaEditor.MainMenu",
      caption: "Java Editor",
      subMenus: [
        { menuId: "JavaEditor.OpenCurrentAction", caption: "Edit Current Java Action" }
      ]
    });
    studioPro.ui.extensionsMenu.addEventListener(
      "menuItemActivated",
      async (args) => {
        if (args.menuId === "JavaEditor.OpenCurrentAction") {
          const activeDoc = await studioPro.ui.editors.getActiveDocument();
          if (activeDoc && activeDoc.documentType === "JavaActions$JavaAction" && activeDoc.documentName && activeDoc.moduleName) {
            await openJavaEditorTab(activeDoc.documentName, activeDoc.moduleName);
          } else {
            await studioPro.ui.messageBoxes.show(
              "warning",
              "No Java Action Selected",
              "Please open a Java Action document first."
            );
          }
        }
      }
    );
    await studioPro.ui.messagePassing.addMessageHandler(async (messageInfo) => {
      const message = messageInfo.message;
      try {
        if (message.type === "getJavaFile" && message.filePath) {
          const content = await studioPro.app.files.getFile(message.filePath);
          await studioPro.ui.messagePassing.sendResponse(messageInfo.messageId, {
            type: "javaFileContent",
            content,
            filePath: message.filePath
          });
        } else if (message.type === "saveJavaFile" && message.filePath && message.content !== void 0) {
          await studioPro.app.files.putFile(message.filePath, message.content);
          await studioPro.ui.messagePassing.sendResponse(messageInfo.messageId, {
            type: "saveResult",
            success: true,
            filePath: message.filePath
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        const isFileNotFound = errorMessage.toLowerCase().includes("not found") || errorMessage.toLowerCase().includes("does not exist") || errorMessage.toLowerCase().includes("no such file");
        const helpfulError = isFileNotFound ? `Java source file not found: ${message.filePath}

The Java file has not been generated yet. Please deploy to Eclipse first (F6) to generate the Java source files.` : errorMessage;
        await studioPro.ui.messagePassing.sendResponse(messageInfo.messageId, {
          type: "error",
          error: helpfulError
        });
      }
    });
  }
};
async function openJavaEditorTab(javaActionName, moduleName) {
  const javaFilePath = `javasource/${moduleName}/actions/${javaActionName}.java`;
  await studioPro.ui.tabs.open(
    {
      title: `${javaActionName}.java`,
      icon: "\u2615"
    },
    {
      componentName: "extension/JavaEditor",
      uiEntrypoint: "tab",
      queryParams: {
        filePath: javaFilePath,
        actionName: javaActionName,
        moduleName
      }
    }
  );
}
export {
  component
};
//# sourceMappingURL=main.js.map
