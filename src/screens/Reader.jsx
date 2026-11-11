import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { booksApi } from '../api.js';

const PREFS_KEY = 'reader_prefs';
const DEFAULT_PREFS = { fontSize: 17, lineHeight: 1.9, margin: 22, dark: false };

function loadPrefs() {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export default function Reader({ onGo }) {
  const [books, setBooks] = useState([]);
  const [book, setBook] = useState(null);
  const [chapter, setChapter] = useState(0);
  const [text, setText] = useState('');
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [prefs, setPrefs] = useState(loadPrefs);
  const [sheet, setSheet] = useState(false);
  const [marks, setMarks] = useState({ annotations: [], bookmarks: [] });
  const [marksOpen, setMarksOpen] = useState(false);
  const [selection, setSelection] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteText, setPasteText] = useState('');

  const viewportRef = useRef(null);
  const contentRef = useRef(null);
  const fileRef = useRef(null);
  const resumeRef = useRef(null);
  const saveTimer = useRef(null);
  const touchRef = useRef({ x: 0, y: 0, swiped: false });

  useEffect(() => {
    booksApi.list().then((r) => setBooks(r.books || [])).catch((e) => setErr(e.message));
  }, []);

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const percent = useMemo(() => {
    if (!book) return 0;
    const total = book.chapters.length;
    return Math.min(1, (chapter + (page + (pages > 0 ? 1 : 0)) / Math.max(1, pages)) / Math.max(1, total));
  }, [book, chapter, page, pages]);

  async function openBook(id) {
    setErr('');
    try {
      const info = await booksApi.book(id);
      setBook(info);
      const p = info.progress || { chapter: 0, page: 0 };
      resumeRef.current = { chapter: p.chapter || 0, page: p.page || 0 };
      await loadChapter(id, p.chapter || 0, p.page || 0);
      booksApi.marks(id).then(setMarks).catch(() => {});
    } catch (e) {
      setErr(e.message);
    }
  }

  async function loadChapter(id, index, restorePage = 0) {
    try {
      const c = await booksApi.chapter(id, index);
      setChapter(c.index);
      setText(c.text);
      setPage(0);
      resumeRef.current = { chapter: c.index, page: restorePage };
    } catch (e) {
      setErr(e.message);
    }
  }

  /* 分页 */
  useLayoutEffect(() => {
    const vp = viewportRef.current;
    const ct = contentRef.current;
    if (!vp || !ct) return;

    const relayout = () => {
      const w = vp.clientWidth;
      ct.style.columnWidth = w + 'px';
      ct.style.height = vp.clientHeight + 'px';
      requestAnimationFrame(() => {
        const total = Math.max(1, Math.round(ct.scrollWidth / Math.max(1, w)));
        setPages(total);
        const want = resumeRef.current;
        if (want && want.chapter === chapter && want.page > 0) {
          setPage(Math.min(want.page, total - 1));
          resumeRef.current = null;
        } else {
          setPage((p) => Math.min(p, total - 1));
        }
      });
    };

    relayout();
    const ro = new ResizeObserver(relayout);
    ro.observe(vp);
    return () => ro.disconnect();
  }, [text, prefs, chapter]);

  /* 存进度（页变了、章变了都存） */
  useEffect(() => {
    if (!book || !text) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      booksApi.progress(book.id, chapter, page, percent).catch(() => {});
      setBooks((list) =>
        list.map((b) =>
          b.id === book.id ? { ...b, progress: { chapter, page, percent, updatedAt: Date.now() } } : b
        )
      );
    }, 600);
    return () => clearTimeout(saveTimer.current);
  }, [book, chapter, page, percent, text]);

  function nextPage() {
    if (page < pages - 1) return setPage(page + 1);
    if (book && chapter < book.chapters.length - 1) return loadChapter(book.id, chapter + 1);
  }

  function prevPage() {
    if (page > 0) return setPage(page - 1);
    if (book && chapter > 0) return loadChapter(book.id, chapter - 1, 9999);
  }

  /* 选中文字 → 批注 */
  function onSelect() {
    const sel = window.getSelection();
    const t = (sel?.toString() || '').trim().replace(/\s+/g, ' ');
    if (t && t.length >= 2 && t.length <= 400) setSelection(t);
    else setSelection('');
  }

  async function saveAnnotation() {
    if (!book) return;
    try {
      const r = await booksApi.annotate(book.id, { chapter, quote: selection, note: noteDraft });
      setMarks({ annotations: r.annotations, bookmarks: r.bookmarks });
      setNoteDraft('');
      setNoteOpen(false);
      setSelection('');
      window.getSelection()?.removeAllRanges();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function addBookmark() {
    if (!book) return;
    try {
      const r = await booksApi.bookmark(book.id, {
        chapter,
        page,
        label: book.chapters[chapter]?.title || ''
      });
      setMarks({ annotations: r.annotations, bookmarks: r.bookmarks });
    } catch (e) {
      setErr(e.message);
    }
  }

  async function jumpTo(ch, pg) {
    setMarksOpen(false);
    await loadChapter(book.id, ch, pg || 0);
  }

  async function upload(file) {
    if (!file) return;
    setBusy(true);
    setErr('');
    try {
      const b64 = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(',')[1]);
        r.onerror = () => reject(new Error('读取失败'));
        r.readAsDataURL(file);
      });
      const r = await booksApi.upload(file.name, b64);
      setBooks(r.books);
      await openBook(r.book.id);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function importPasted() {
    if (!pasteText.trim()) return;
    setBusy(true);
    setErr('');
    try {
      const res = await booksApi.importText(pasteTitle.trim() || '粘贴的书', pasteText);
      setBooks(res.books);
      setPasteOpen(false);
      setPasteText('');
      setPasteTitle('');
      await openBook(res.book.id);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!window.confirm('删掉这本书？')) return;
    await booksApi.remove(id).catch(() => {});
    setBooks((b) => b.filter((x) => x.id !== id));
    if (book?.id === id) setBook(null);
  }

  useEffect(() => {
    if (!book) return;
    const h = (e) => {
      if (e.key === 'ArrowLeft') prevPage();
      if (e.key === 'ArrowRight' || e.key === ' ') nextPage();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [book, page, pages, chapter]);

  /* ---------------- 书架 ---------------- */
  if (!book) {
    return (
      <div className="reader-shell">
        <div className="reader-top">
          <button className="back" onClick={() => onGo('home')}>
            <svg viewBox="0 0 24 24">
              <path d="M14.5 5.5 8 12l6.5 6.5" />
            </svg>
          </button>
          <div className="reader-title">书架</div>
          <button className="reader-btn" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? '导入中…' : '导入'}
          </button>
          <button className="reader-btn" onClick={() => setPasteOpen(true)}>
            粘贴
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.epub,text/plain,application/epub+zip"
            style={{ display: 'none' }}
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </div>

        <div className="book-list">
          {books.length === 0 && <div className="hint-line">还没有书。点右上角「导入」，选 TXT 或 EPUB。</div>}
          {books.map((b) => {
            const pct = Math.round((b.progress?.percent || 0) * 100);
            return (
              <div className="book-row" key={b.id}>
                <div className="book-main" onClick={() => openBook(b.id)}>
                  <div className="book-name">{b.title}</div>
                  <div className="book-meta">
                    {b.author ? b.author + ' · ' : ''}
                    {b.chapters} 章 · {Math.round(b.chars / 1000)}k 字
                    {b.progress ? ` · 第 ${(b.progress.chapter || 0) + 1} 章 · ${pct}%` : ''}
                  </div>
                  <div className="book-bar">
                    <i style={{ width: pct + '%' }} />
                  </div>
                </div>
                <button className="book-del" onClick={() => remove(b.id)}>
                  ×
                </button>
              </div>
            );
          })}
        </div>
        {pasteOpen && (
          <div className="reader-sheet">
            <div className="gl">粘贴正文</div>
            <input
              className="reader-title-input"
              value={pasteTitle}
              placeholder="书名（可不填）"
              onChange={(e) => setPasteTitle(e.target.value)}
            />
            <textarea
              className="reader-note"
              style={{ minHeight: 150 }}
              value={pasteText}
              placeholder="把一章正文粘进来。有「第 X 章」这种标题会自动分章。"
              onChange={(e) => setPasteText(e.target.value)}
            />
            <div className="reader-sheet-row">
              <button className="reader-toggle" onClick={() => { setPasteOpen(false); setPasteText(''); }}>
                取消
              </button>
              <button className="reader-toggle on" onClick={importPasted} disabled={busy || !pasteText.trim()}>
                {busy ? '…' : '入库'}
              </button>
            </div>
          </div>
        )}

        {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
      </div>
    );
  }

  /* ---------------- 阅读 ---------------- */
  const chapterTitle = book.chapters[chapter]?.title || '';

  return (
    <div className={'reader-shell reader-view' + (prefs.dark ? ' dark' : '')}>
      <div className="reader-top">
        <button
          className="back"
          onClick={() => {
            setBook(null);
            setText('');
            setMarksOpen(false);
            booksApi.list().then((r) => setBooks(r.books || [])).catch(() => {});
          }}
        >
          <svg viewBox="0 0 24 24">
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
        </button>
        <div className="reader-title">{chapterTitle}</div>
        <button className="reader-btn" onClick={addBookmark} title="加书签">
          ⌑
        </button>
        <button className="reader-btn" onClick={() => setMarksOpen((v) => !v)}>
          标注 {marks.annotations.length + marks.bookmarks.length}
        </button>
        <button className="reader-btn" onClick={() => setSheet((v) => !v)}>
          Aa
        </button>
      </div>

      <div
        className="reader-viewport"
        ref={viewportRef}
        onClick={() => {
          /* 滑过就不算点击 */
          if (touchRef.current.swiped) {
            touchRef.current.swiped = false;
            return;
          }
          if (window.getSelection()?.toString().trim()) return;
          /* 点哪里都是下一页 */
          nextPage();
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          touchRef.current = { x: t.clientX, y: t.clientY, swiped: false };
        }}
        onTouchEnd={(e) => {
          const t = e.changedTouches[0];
          const dx = t.clientX - touchRef.current.x;
          const dy = t.clientY - touchRef.current.y;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
            touchRef.current.swiped = true;
            /* 从左往右滑 = 上一页；从右往左滑 = 下一页 */
            if (dx > 0) prevPage();
            else nextPage();
          }
        }}
        onMouseUp={onSelect}
        onTouchEnd={onSelect}
      >
        <div
          className="reader-pages"
          ref={contentRef}
          style={{
            columnWidth: '100%',
            columnGap: 0,
            columnFill: 'auto',
            height: '100%',
            fontSize: prefs.fontSize + 'px',
            lineHeight: prefs.lineHeight,
            padding: `${prefs.margin}px ${prefs.margin}px`,
            transform: `translateX(${-page * 100}%)`
          }}
        >
          {text}
        </div>
      </div>

      <div className="reader-foot">
        <span>
          {chapter + 1}/{book.chapters.length}
        </span>
        <span>{Math.round(percent * 100)}%</span>
        <span>
          {page + 1}/{pages}
        </span>
      </div>

      {selection && !noteOpen && (
        <button className="reader-float" onClick={() => setNoteOpen(true)}>
          「{selection.slice(0, 12)}…」批注
        </button>
      )}

      {noteOpen && (
        <div className="reader-sheet">
          <div className="reader-quote">{selection}</div>
          <textarea
            className="reader-note"
            value={noteDraft}
            placeholder="想写什么就写（可以不写）"
            onChange={(e) => setNoteDraft(e.target.value)}
          />
          <div className="reader-sheet-row">
            <button className="reader-toggle" onClick={() => { setNoteOpen(false); setSelection(''); }}>
              取消
            </button>
            <button className="reader-toggle on" onClick={saveAnnotation}>
              保存批注
            </button>
          </div>
        </div>
      )}

      {sheet && !noteOpen && (
        <div className="reader-sheet">
          <label>
            字号
            <input type="range" min="13" max="26" step="1" value={prefs.fontSize} onChange={(e) => setPrefs({ ...prefs, fontSize: Number(e.target.value) })} />
            <b>{prefs.fontSize}</b>
          </label>
          <label>
            行距
            <input type="range" min="1.4" max="2.6" step="0.05" value={prefs.lineHeight} onChange={(e) => setPrefs({ ...prefs, lineHeight: Number(e.target.value) })} />
            <b>{prefs.lineHeight.toFixed(2)}</b>
          </label>
          <label>
            页边距
            <input type="range" min="10" max="48" step="1" value={prefs.margin} onChange={(e) => setPrefs({ ...prefs, margin: Number(e.target.value) })} />
            <b>{prefs.margin}</b>
          </label>
          <div className="reader-sheet-row">
            <button className={'reader-toggle' + (prefs.dark ? ' on' : '')} onClick={() => setPrefs({ ...prefs, dark: !prefs.dark })}>
              深色
            </button>
            <button className="reader-toggle" onClick={() => setPrefs({ ...DEFAULT_PREFS })}>
              恢复默认
            </button>
          </div>
        </div>
      )}

      {marksOpen && (
        <div className="reader-marks">
          <div className="reader-marks-head">
            <span>批注 {marks.annotations.length}</span>
            <span>书签 {marks.bookmarks.length}</span>
            <button onClick={() => setMarksOpen(false)}>×</button>
          </div>
          <div className="reader-marks-list">
            {marks.bookmarks.map((b) => (
              <div className="mark-row" key={b.id}>
                <div className="mark-main" onClick={() => jumpTo(b.chapter, b.page)}>
                  <b>⌑ {b.label || '第 ' + (b.chapter + 1) + ' 章'}</b>
                  <span>
                    第 {b.chapter + 1} 章 · 第 {b.page + 1} 页
                  </span>
                </div>
                <button onClick={() => booksApi.unbookmark(book.id, b.id).then(setMarks)}>×</button>
              </div>
            ))}
            {marks.annotations.map((a) => (
              <div className="mark-row" key={a.id}>
                <div className="mark-main" onClick={() => jumpTo(a.chapter, 0)}>
                  <b>
                    {a.who === 'ta' ? '他 · ' : ''}
                    {a.quote || '（无引用）'}
                  </b>
                  {a.note && <span>{a.note}</span>}
                  <span>第 {a.chapter + 1} 章</span>
                </div>
                <button onClick={() => booksApi.unannotate(book.id, a.id).then(setMarks)}>×</button>
              </div>
            ))}
            {marks.annotations.length + marks.bookmarks.length === 0 && (
              <div className="hint-line">还没有批注或书签。选中文字试试，或者点顶上的 ⌑。</div>
            )}
          </div>
        </div>
      )}

      {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
    </div>
  );
}
