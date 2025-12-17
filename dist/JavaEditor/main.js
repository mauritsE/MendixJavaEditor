import {
  s
} from "./chunk-3OMKR3A7.js";
import "./chunk-G3PMV62Z.js";

// src/main/index.ts
var studioPro;
async function findDocumentById(documentId) {
  const modules = await studioPro.app.model.projects.getModules();
  for (const module of modules) {
    const rootDocs = await studioPro.app.model.projects.getDocumentsInfo(module.$ID);
    const rootMatch = rootDocs.find((doc) => doc.$ID === documentId);
    if (rootMatch && rootMatch.name) {
      return {
        documentId,
        documentName: rootMatch.name,
        moduleName: module.name
      };
    }
    const found = await searchFoldersForDocument(module.$ID, module.name, documentId);
    if (found) {
      return found;
    }
  }
  return null;
}
async function searchFoldersForDocument(containerId, moduleName, documentId) {
  const folders = await studioPro.app.model.projects.getFolders(containerId);
  for (const folder of folders) {
    const docs = await studioPro.app.model.projects.getDocumentsInfo(folder.$ID);
    const match = docs.find((doc) => doc.$ID === documentId);
    if (match && match.name) {
      return {
        documentId,
        documentName: match.name,
        moduleName
      };
    }
    const found = await searchFoldersForDocument(folder.$ID, moduleName, documentId);
    if (found) {
      return found;
    }
  }
  return null;
}
var component = {
  async loaded(componentContext) {
    studioPro = s(componentContext);
    await studioPro.ui.appExplorer.addContextMenu(
      {
        menuId: "JavaEditor.OpenEditor",
        caption: "Edit Java Source",
        action: async (arg) => {
          if (!arg || !arg.documentId) {
            await studioPro.ui.messageBoxes.show(
              "warning",
              "Could not determine Java Action",
              "No document ID was provided by the context menu."
            );
            return;
          }
          const docInfo = await findDocumentById(arg.documentId);
          if (docInfo) {
            await openJavaEditorTab(docInfo.documentName, docInfo.moduleName);
          } else {
            await studioPro.ui.messageBoxes.show(
              "warning",
              "Could not find Java Action",
              `Unable to find document with ID: ${arg.documentId}`
            );
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
