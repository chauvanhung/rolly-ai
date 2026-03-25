"""
app/rag/loader.py
=================
Loads legal documents from the laws directory and splits them into
text chunks suitable for embedding and retrieval.
"""
from __future__ import annotations

import os
import subprocess
from pathlib import Path
from typing import List, Tuple

from doc2txt.converter import AntiwordConverter
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import Docx2txtLoader, PyPDFLoader

from app.core.config import settings
from app.core.logger import logger


def _load_doc_legacy(file_path: str) -> str:
    converter = AntiwordConverter()
    antiword_home = str(Path(converter.binary_path).parent)
    cmd = [converter.binary_path, '-m', 'UTF-8.txt', file_path]
    env = os.environ.copy()
    env['ANTIWORDHOME'] = antiword_home
    result = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
        check=False,
    )
    if result.returncode != 0:
        stderr = result.stderr.decode('utf-8', errors='replace').strip()
        raise RuntimeError(stderr or 'Antiword failed to parse .doc file')
    return result.stdout.decode('utf-8', errors='replace')


def load_law_documents() -> List[Tuple[str, str]]:
    """
    Load all legal files from the laws directory.
    Returns a list of (chunk_text, source_filename) tuples.
    """
    laws_dir = settings.laws_dir
    if not os.path.exists(laws_dir):
        logger.warning("Laws directory not found: %s", laws_dir)
        return []

    source_files = [
        f for f in os.listdir(laws_dir)
        if f.lower().endswith(('.pdf', '.docx', '.doc', '.txt', '.md'))
    ]
    if not source_files:
        logger.warning("No PDF/DOCX/DOC files found in %s", laws_dir)
        return []

    logger.info("Loading %s law file(s) from %s", len(source_files), laws_dir)

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=['\n\n', '\n', '.', '!', '?', ',', ' ', ''],
    )

    all_chunks: List[Tuple[str, str]] = []

    for source_file in source_files:
        file_path = os.path.join(laws_dir, source_file)
        try:
            lower_name = source_file.lower()
            if lower_name.endswith('.pdf'):
                docs = PyPDFLoader(file_path).load()
                chunks = text_splitter.split_documents(docs)
                chunk_count = 0
                for chunk in chunks:
                    text = chunk.page_content.strip()
                    if len(text) > 50:
                        all_chunks.append((text, source_file))
                        chunk_count += 1
            elif lower_name.endswith('.docx'):
                docs = Docx2txtLoader(file_path).load()
                chunks = text_splitter.split_documents(docs)
                chunk_count = 0
                for chunk in chunks:
                    text = chunk.page_content.strip()
                    if len(text) > 50:
                        all_chunks.append((text, source_file))
                        chunk_count += 1
            elif lower_name.endswith('.doc'):
                raw_text = _load_doc_legacy(file_path)
                chunks = text_splitter.create_documents([raw_text])
                chunk_count = 0
                for chunk in chunks:
                    text = chunk.page_content.strip()
                    if len(text) > 50:
                        all_chunks.append((text, source_file))
                        chunk_count += 1
            else:
                raw_text = Path(file_path).read_text(encoding='utf-8', errors='replace')
                chunks = text_splitter.create_documents([raw_text])
                chunk_count = 0
                for chunk in chunks:
                    text = chunk.page_content.strip()
                    if len(text) > 50:
                        all_chunks.append((text, source_file))
                        chunk_count += 1
            logger.info("  %s: %s chunks", source_file, chunk_count)
        except Exception as exc:
            logger.error("Failed to load %s: %s", source_file, exc)

    logger.info("Total chunks loaded: %s", len(all_chunks))
    return all_chunks
