const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get("/api/bpmn-files", (req, res) => {
  const projectPath = path.resolve(__dirname, "..");
  const bpmnFolderPath = path.join(projectPath, "src", "bpmn");

  console.log("Buscando archivos BPMN en:", bpmnFolderPath);

  if (!fs.existsSync(bpmnFolderPath)) {
    console.error(`La carpeta ${bpmnFolderPath} no existe.`);
    return res.status(404).json({
      error: "La carpeta de diagramas no existe",
      path: bpmnFolderPath,
    });
  }

  fs.readdir(bpmnFolderPath, (err, files) => {
    if (err) {
      console.error("Error al leer la carpeta bpmn:", err);
      return res.status(500).json({
        error: "No se pudo leer la carpeta de diagramas",
        details: err.message,
      });
    }

    const bpmnFiles = files.filter((file) => file.endsWith(".bpmn"));
    console.log("Archivos BPMN encontrados:", bpmnFiles);
    res.json(bpmnFiles);
  });
});

app.use("/bpmn", (req, res, next) => {
  const filePath = path.join(
    path.resolve(__dirname, ".."),
    "src",
    "bpmn",
    req.path
  );
  console.log("Solicitando archivo:", filePath);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    console.error(`El archivo ${filePath} no existe.`);
    next();
  }
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`API en http://localhost:${PORT}/api/bpmn-files`);

  const bpmnFolderPath = path.join(
    path.resolve(__dirname, ".."),
    "src",
    "bpmn"
  );
  console.log(`Carpeta BPMN: ${bpmnFolderPath}`);

  if (fs.existsSync(bpmnFolderPath)) {
    console.log("La carpeta BPMN existe.");
  } else {
    console.error(
      "La carpeta BPMN no existe. Por favor, créala en:",
      bpmnFolderPath
    );
  }
});
