import { Router } from "express";
import multer from "multer";
import crypto from "crypto";
import { parseFile } from "../services/parser.js";
import { sessionStore } from "../store/sessionStore.js";
import { generateExampleQuestions } from "../services/llm.js";

const upload = multer({
  dest: "/tmp/brewlytics-uploads",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream",
    ];
    const ext = file.originalname.toLowerCase().split(".").pop();
    if (allowed.includes(file.mimetype) || ["csv", "xlsx", "xls"].includes(ext || "")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV and Excel files are supported"));
    }
  },
});

const router = Router();

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const { data, schema } = await parseFile(
      req.file.path,
      req.file.originalname
    );

    const sessionId = crypto.randomUUID();

    sessionStore.create({
      id: sessionId,
      filename: req.file.originalname,
      data,
      schema,
      messages: [],
    });

    res.json({ sessionId, schema });

    // Async: generate example questions and send via socket
    generateExampleQuestions(sessionId).then((questions) => {
      const io = req.app.get("io");
      if (io && questions.length > 0) {
        io.emit("session:examples", { sessionId, questions });
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    res.status(400).json({ error: message });
  }
});

router.get("/sessions/:id/data", (req, res) => {
  const session = sessionStore.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 100));
  const start = (page - 1) * pageSize;
  const rows = session.data.slice(start, start + pageSize);

  res.json({
    rows,
    page,
    pageSize,
    totalRows: session.data.length,
    totalPages: Math.ceil(session.data.length / pageSize),
  });
});

export default router;
