import React, { useState, useEffect, useRef } from 'react';
import { ReactReader } from 'react-reader';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const API = "https://project-reads-backend.onrender.com";

const REQUIRED_HOURS = 6;
const REQUIRED_SECONDS = REQUIRED_HOURS * 60 * 60; 
const REQUIRED_PERCENTAGE = 25;

export default function App() {
  const [currentUser, setCurrentUser] = useState(null); 
  const [isRegistering, setIsRegistering] = useState(false);
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  const [activeTab, setActiveTab] = useState('marketplace');
  const [books, setBooks] = useState([]);
  const [userLogs, setUserLogs] = useState([]);
  const [rentedBooks, setRentedBooks] = useState([]);
  
  const [readStats, setReadStats] = useState(() => {
    const saved = localStorage.getItem('projectReadsStats');
    return saved ? JSON.parse(saved) : {};
  });
  
  // Edit State
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editCopies, setEditCopies] = useState('');
  const [editCover, setEditCover] = useState(null); // NEW: Track cover during edit

  const [viewingFile, setViewingFile] = useState(null);
  const [viewingBookId, setViewingBookId] = useState(null);
  const [fileType, setFileType] = useState(null);
  
  const [epubLocation, setEpubLocation] = useState(null);
  const [rendition, setRendition] = useState(null);
  
  const [pdfNumPages, setPdfNumPages] = useState(null);
  const [pdfPageNumber, setPdfPageNumber] = useState(1);
  const [flipAnim, setFlipAnim] = useState('');

  const sessionStartRef = useRef(null);
  const highestProgressRef = useRef(0);
  const latestEpubLocation = useRef(null);
  const epubRendition = useRef(null);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [copies, setCopies] = useState('');
  const [file, setFile] = useState(null);
  const [cover, setCover] = useState(null); 

  useEffect(() => { 
    if(currentUser) {
      setActiveTab(currentUser.role === 'admin' ? 'marketplace' : 'home');
      fetchBooks(); 
      if(currentUser.role === 'admin') fetchLogs();
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('projectReadsStats', JSON.stringify(readStats));
  }, [readStats]);

  const saveSessionData = () => {
    if(!viewingBookId || !currentUser || !sessionStartRef.current) return;
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - sessionStartRef.current) / 1000);
    const finalProgress = highestProgressRef.current;
    const key = `${currentUser.username}_${viewingBookId}`;
    
    setReadStats(prev => {
      const current = prev[key] || { progress: 0, seconds: 0 };
      return { 
        ...prev, 
        [key]: { 
          progress: Math.max(current.progress, finalProgress), 
          seconds: current.seconds + elapsedSeconds 
        } 
      };
    });
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = isRegistering ? '/auth/register' : '/auth/login';
    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUsername, password: authPassword })
      });
      if (!res.ok) throw new Error('Auth failed');
      const data = await res.json();
      setCurrentUser(data); setAuthUsername(''); setAuthPassword('');
      setRentedBooks([]); 
    } catch (e) { alert(isRegistering ? "Username taken!" : "Invalid credentials!"); }
  };

  const fetchBooks = async () => {
    try {
      const res = await fetch(`${API}/books`);
      const data = await res.json();
      setBooks(Array.isArray(data) ? data : []);
    } catch (e) { setBooks([]); }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API}/auth/logs`);
      const data = await res.json();
      setUserLogs(data);
    } catch (e) { setUserLogs([]); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!cover) { alert("Please provide a cover image!"); return; }
    
    const fd = new FormData();
    fd.append('file', file); 
    fd.append('cover', cover);
    fd.append('title', title); 
    fd.append('author', author); 
    fd.append('copies', copies);
    
    try {
      const res = await fetch(`${API}/admin/add`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      alert("System Update: Book Inserted!"); 
      setTitle(''); setAuthor(''); setCopies(''); setFile(null); setCover(null);
      document.getElementById('fileInput').value = "";
      document.getElementById('coverInput').value = "";
      setActiveTab('marketplace'); fetchBooks();
    } catch(error) { alert("Error uploading file."); }
  };

  const handleRent = async (id) => {
    const fd = new FormData();
    fd.append('username', currentUser.username);
    try {
      await fetch(`${API}/books/${id}/rent`, { method: 'POST', body: fd });
      setRentedBooks([...rentedBooks, id]); fetchBooks(); setActiveTab('home'); 
      if(!readStats[`${currentUser.username}_${id}`]) {
        setReadStats(prev => ({...prev, [`${currentUser.username}_${id}`]: { progress: 0, seconds: 0 }}));
      }
    } catch(error) { console.error("Rent failed"); }
  };

  const startEdit = (book) => {
    setEditingId(book.id); 
    setEditTitle(book.title);
    setEditAuthor(book.author); 
    setEditCopies(book.availableCopies);
    setEditCover(null); // Reset cover selection
  };

  const saveEdit = async (id) => {
    const fd = new FormData();
    fd.append('title', editTitle); 
    fd.append('author', editAuthor); 
    fd.append('copies', editCopies);
    if (editCover) {
      fd.append('cover', editCover); // Append new cover if admin selected one
    }
    
    try {
      await fetch(`${API}/books/${id}/update`, { method: 'POST', body: fd });
      setEditingId(null); fetchBooks();
    } catch(error) { alert("Failed to update book."); }
  };

  const handleRevoke = async (bookId, username) => {
    const fd = new FormData();
    fd.append('username', username);
    try {
      await fetch(`${API}/books/${bookId}/revoke`, { method: 'POST', body: fd });
      fetchBooks(); 
    } catch(error) { console.error("Revoke failed"); }
  };

  const submitReview = async (id, text) => {
    if(!text) return;
    await fetch(`${API}/books/${id}/review`, { method: 'POST', headers: {'Content-Type': 'text/plain'}, body: text });
    fetchBooks();
  };

  const parseReviews = (str) => str ? str.split('|||').filter(r => r.trim() !== '') : [];

  const playPageSound = () => {
    const audioEl = document.getElementById('pageTurnSound');
    if (audioEl) { audioEl.currentTime = 0; audioEl.play().catch(() => {}); }
  };

  const openReader = (filePath, bookId) => {
    setViewingFile(`${API}/view/${filePath}`);
    setViewingBookId(bookId);
    setFileType(filePath.toLowerCase().endsWith('.epub') ? 'epub' : 'pdf');
    setPdfPageNumber(1);
    
    highestProgressRef.current = readStats[`${currentUser?.username}_${bookId}`]?.progress || 0;
    sessionStartRef.current = Date.now(); 
  };

  const closeReader = () => {
    saveSessionData();
    setViewingFile(null); setViewingBookId(null); setFileType(null);
    latestEpubLocation.current = null; epubRendition.current = null; sessionStartRef.current = null;
  };

  const handlePdfPrev = () => {
    if (pdfPageNumber <= 1) return;
    playPageSound(); setFlipAnim('flip-out-right'); 
    setTimeout(() => {
      const newPage = pdfPageNumber - 1; setPdfPageNumber(newPage);
      if(pdfNumPages) highestProgressRef.current = Math.max(highestProgressRef.current, (newPage / pdfNumPages) * 100);
      setFlipAnim('flip-in-left'); setTimeout(() => setFlipAnim(''), 300);
    }, 250);
  };

  const handlePdfNext = () => {
    if (pdfPageNumber >= pdfNumPages) return;
    playPageSound(); setFlipAnim('flip-out-left'); 
    setTimeout(() => {
      const newPage = pdfPageNumber + 1; setPdfPageNumber(newPage);
      if(pdfNumPages) highestProgressRef.current = Math.max(highestProgressRef.current, (newPage / pdfNumPages) * 100);
      setFlipAnim('flip-in-right'); setTimeout(() => setFlipAnim(''), 300);
    }, 250); 
  };

  const handleEpubPrev = () => {
    if (epubRendition.current) { playPageSound(); epubRendition.current.prev(); }
  };

  const handleEpubNext = () => {
    if (epubRendition.current) { playPageSound(); epubRendition.current.next(); }
  };

  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const getUserRentalInfo = (rentalsString) => {
    if (!rentalsString) return { isRented: false, isExpired: false, rentTime: null, due: null };
    const rentals = rentalsString.split('|||');
    for (let r of rentals) {
      if (r.startsWith(currentUser.username + ":") || r === currentUser.username) {
        let rentTime = Date.now();
        if (r.includes(":")) {
           const timestamp = parseInt(r.split(":")[1]);
           if (timestamp > Date.now() + 86400000) rentTime = timestamp - SEVEN_DAYS; else rentTime = timestamp;
        }
        const due = rentTime + SEVEN_DAYS;
        return { isRented: true, isExpired: Date.now() > due, rentTime, due };
      }
    }
    return { isRented: false, isExpired: false, rentTime: null, due: null };
  };

  const getAllRentals = (rentalsString) => {
    if (!rentalsString) return [];
    return rentalsString.split('|||').filter(r => r.trim() !== '').map(r => {
      const parts = r.split(':');
      const user = parts[0]; let rentTime = Date.now();
      if (parts.length > 1) {
        const timestamp = parseInt(parts[1]);
        if (timestamp > Date.now() + 86400000) rentTime = timestamp - SEVEN_DAYS; else rentTime = timestamp;
      }
      return { user, rentTime, due: rentTime + SEVEN_DAYS };
    });
  };

  if (!currentUser) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.glassBox}>
          <h2 className="glow-text" style={{ color: '#fff', marginBottom: 30, fontSize: 32 }}>Project Reads</h2>
          <form onSubmit={handleAuth} style={{display: 'flex', flexDirection: 'column'}}>
            <input placeholder="Username" value={authUsername} onChange={e => setAuthUsername(e.target.value)} style={styles.glassInput} required/>
            <input type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} style={styles.glassInput} required/>
            <button className="fluid-btn neon-blue" type="submit" style={styles.btnBase}>{isRegistering ? 'Create Account' : 'Initialize Link'}</button>
          </form>
          <p className="hover-link" style={{color: '#a5b4fc', marginTop: 20, cursor: 'pointer'}} onClick={() => setIsRegistering(!isRegistering)}>
            {isRegistering ? "Existing operative? Authenticate here." : "New recruit? Register profile."}
          </p>
        </div>
        <style>{fluidStyles}</style>
      </div>
    );
  }

  let displayedBooks = books;
  if (activeTab === 'home') displayedBooks = books.filter(b => getUserRentalInfo(b.activeRentals).isRented);

  const BookCover = ({ coverImage }) => {
    if (coverImage) {
      return <img src={`${API}/view/${coverImage}`} alt="Cover" style={styles.coverImage} />;
    }
    return (
      <div style={styles.coverFallback}>
        <div style={{fontSize: 24}}>📖</div>
      </div>
    );
  };

  return (
    <div style={styles.dashboard}>
      <audio id="pageTurnSound" src="/page-flip.mp3" preload="auto" style={{display: 'none'}} />

      <div style={styles.sidebar}>
        <h2 className="glow-text" style={{color: '#fff', marginBottom: 40, letterSpacing: 2, textAlign: 'center'}}>Project Reads</h2>
        <div style={{background: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 10, marginBottom: 30, border: '1px solid rgba(255,255,255,0.1)'}}>
          <div style={{color: '#818cf8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1}}>Active User</div>
          <div style={{color: '#fff', fontSize: 18, fontWeight: 'bold'}}>{currentUser.username}</div>
        </div>
        
        {currentUser.role === 'user' && (
          <>
            <button className={activeTab === 'home' ? 'nav-active' : 'nav-btn'} onClick={() => setActiveTab('home')}>My Bookshelf</button>
            <button className={activeTab === 'marketplace' ? 'nav-active' : 'nav-btn'} onClick={() => setActiveTab('marketplace')}>Marketplace</button>
            <button className={activeTab === 'reviews' ? 'nav-active' : 'nav-btn'} onClick={() => setActiveTab('reviews')}>Community Reviews</button>
          </>
        )}

        {currentUser.role === 'admin' && (
          <>
            <button className={activeTab === 'marketplace' ? 'nav-active' : 'nav-btn'} onClick={() => setActiveTab('marketplace')}>Global Archive</button>
            <button className={activeTab === 'reviews' ? 'nav-active' : 'nav-btn'} onClick={() => setActiveTab('reviews')}>Community Reviews</button>
            <button className={activeTab === 'add' ? 'nav-active' : 'nav-btn'} onClick={() => setActiveTab('add')}>Upload Pipeline</button>
            <button className={activeTab === 'logs' ? 'nav-active' : 'nav-btn'} onClick={() => setActiveTab('logs')}>System Logs</button>
          </>
        )}
        
        <button onClick={() => setCurrentUser(null)} className="fluid-btn neon-red" style={{...styles.btnBase, marginTop: 'auto'}}>Terminate Session</button>
      </div>

      <div style={styles.content}>
        <h1 style={{color: '#fff', marginBottom: 40, fontWeight: 300, letterSpacing: 1}}>
          {activeTab === 'home' ? 'My Rented Collection' : 
           activeTab === 'marketplace' ? (currentUser.role === 'admin' ? 'Global Archive' : 'Book Marketplace') : 
           activeTab === 'reviews' ? 'Global Review Network' :
           activeTab === 'add' ? 'Data Ingestion' : 'Security Logs'}
        </h1>

        {activeTab === 'add' && currentUser.role === 'admin' && (
          <form onSubmit={handleUpload} style={styles.glassCard}>
            <input placeholder="Archive Title" value={title} onChange={e => setTitle(e.target.value)} style={styles.glassInput} required/>
            <input placeholder="Author / Source" value={author} onChange={e => setAuthor(e.target.value)} style={styles.glassInput} required/>
            <input type="number" placeholder="License Count (Copies)" value={copies} onChange={e => setCopies(e.target.value)} style={styles.glassInput} required/>
            
            <div style={{marginBottom: 10, color: '#a5b4fc', fontSize: 14}}>1. Upload Book File (PDF/EPUB)</div>
            <input id="fileInput" type="file" onChange={e => setFile(e.target.files[0])} style={{...styles.glassInput, padding: '10px 15px'}} required/>
            
            <div style={{marginBottom: 10, color: '#a5b4fc', fontSize: 14}}>2. Upload Cover Image (PNG/JPG/WEBP)</div>
            <input id="coverInput" type="file" accept="image/*" onChange={e => setCover(e.target.files[0])} style={{...styles.glassInput, padding: '10px 15px'}} required/>
            
            <button className="fluid-btn neon-green" type="submit" style={{...styles.btnBase, marginTop: 10}}>Commence Upload</button>
          </form>
        )}

        {activeTab === 'logs' && currentUser.role === 'admin' && (
          <div style={styles.glassCard}>
            <h3 style={{color: '#fff', marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 10}}>Network Activity</h3>
            {userLogs.map(log => (
              <div key={log.id} style={{padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between'}}>
                <span style={{color: '#a5b4fc', fontWeight: 'bold'}}>{log.username} <span style={{fontSize: 12, color: '#6b7280'}}>({log.role})</span></span>
                <span style={{color: '#34d399', fontFamily: 'monospace'}}>{log.lastLogin ? new Date(log.lastLogin).toLocaleString() : 'Standby'}</span>
              </div>
            ))}
          </div>
        )}

        {(activeTab === 'reviews' || activeTab === 'marketplace' || activeTab === 'home') && (
          <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: 25}}>
            {displayedBooks.map(b => {
               const stats = readStats[`${currentUser.username}_${b.id}`] || { progress: 0, seconds: 0 };
               const currentHours = (stats.seconds / 3600).toFixed(2);
               const unlocked = stats.progress >= REQUIRED_PERCENTAGE && stats.seconds >= REQUIRED_SECONDS;
               const { isRented, isExpired, rentTime, due } = getUserRentalInfo(b.activeRentals);
               const isEditing = editingId === b.id;

               return (
                 <div key={b.id} className="book-card" style={styles.glassCard}>
                   <div style={{ display: 'flex', gap: '25px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                     
                     <BookCover coverImage={b.coverImage} />

                     <div style={{ flex: 1, minWidth: '250px' }}>
                       {isEditing ? (
                         <div style={{display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 15}}>
                           <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
                             <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{...styles.glassInput, marginBottom: 0, flex: 1}} placeholder="Title"/>
                             <input value={editAuthor} onChange={e => setEditAuthor(e.target.value)} style={{...styles.glassInput, marginBottom: 0, flex: 1}} placeholder="Author"/>
                             <input type="number" value={editCopies} onChange={e => setEditCopies(e.target.value)} style={{...styles.glassInput, marginBottom: 0, width: 100}} placeholder="Copies"/>
                           </div>
                           {/* NEW COVER UPLOAD DURING EDIT */}
                           <div style={{display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'}}>
                             <span style={{color: '#a5b4fc', fontSize: 13}}>Replace Cover (Optional):</span>
                             <input type="file" accept="image/*" onChange={e => setEditCover(e.target.files[0])} style={{...styles.glassInput, marginBottom: 0, padding: '8px 10px', fontSize: 12, flex: 1}} />
                             <button className="fluid-btn neon-green" onClick={() => saveEdit(b.id)} style={{...styles.btnBase, padding: '10px 20px'}}>Save Changes</button>
                             <button className="fluid-btn neon-red" onClick={() => setEditingId(null)} style={{...styles.btnBase, padding: '10px 20px'}}>Cancel</button>
                           </div>
                         </div>
                       ) : (
                         <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 15}}>
                           <div>
                             <h3 style={{margin: '0 0 8px 0', color: '#fff', fontSize: 24, fontWeight: 600}}>{b.title}</h3>
                             <p style={{margin: 0, color: '#a5b4fc', fontSize: 16}}>By {b.author}</p>
                             
                             {(activeTab === 'marketplace' || currentUser.role === 'admin') && activeTab !== 'reviews' && (
                               <p style={{margin: '12px 0 0 0', fontSize: 14, color: b.availableCopies > 0 ? '#34d399' : '#ef4444', display: 'flex', alignItems: 'center', gap: 5}}>
                                  <span style={styles.dot(b.availableCopies > 0 ? '#34d399' : '#ef4444')}></span>
                                  {b.availableCopies} Copies Available
                               </p>
                             )}

                             {activeTab === 'home' && currentUser.role === 'user' && (
                                <div style={{marginTop: 15, padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 8, borderLeft: `3px solid ${isExpired ? '#ef4444' : '#fbbf24'}`}}>
                                  <p style={{margin: '0 0 4px 0', fontSize: 13, color: '#9ca3af'}}>Rented: {new Date(rentTime).toLocaleDateString()}</p>
                                  <p style={{margin: 0, fontSize: 13, color: isExpired ? '#ef4444' : '#fbbf24', fontWeight: 'bold'}}>
                                    {isExpired ? "Access Expired." : `Expires on: ${new Date(due).toLocaleDateString()}`}
                                  </p>
                                </div>
                             )}
                           </div>
                           
                           {activeTab !== 'reviews' && (
                             <div style={{display: 'flex', gap: 15}}>
                               {currentUser.role === 'admin' && activeTab === 'marketplace' && <button className="fluid-btn neon-orange" onClick={() => startEdit(b)} style={styles.btnBase}>Edit Details</button>}
                               {currentUser.role === 'admin' && <button className="fluid-btn neon-blue" onClick={() => openReader(b.filePath, b.id)} style={styles.btnBase}>Inspect File</button>}

                               {activeTab === 'marketplace' && currentUser.role === 'user' && (
                                 <>
                                   {!isRented && b.availableCopies > 0 && <button className="fluid-btn neon-orange" onClick={() => handleRent(b.id)} style={styles.btnBase}>Rent Book</button>}
                                   {!isRented && b.availableCopies === 0 && <button disabled style={{...styles.btnBase, background: 'rgba(255,255,255,0.05)', color: '#6b7280', cursor: 'not-allowed'}}>Out of Stock</button>}
                                   {isRented && <button disabled style={{...styles.btnBase, background: 'rgba(52, 211, 153, 0.2)', color: '#34d399', border: '1px solid #34d399'}}>Already Possess 1 Copy</button>}
                                 </>
                               )}

                               {activeTab === 'home' && currentUser.role === 'user' && (
                                  isExpired ? (
                                     <button disabled style={{...styles.btnBase, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)'}}>License Expired</button>
                                  ) : (
                                     <button className="fluid-btn neon-blue" onClick={() => openReader(b.filePath, b.id)} style={styles.btnBase}>Read Book</button>
                                  )
                               )}
                             </div>
                           )}
                         </div>
                       )}

                       {activeTab === 'reviews' && currentUser.role === 'user' && (
                         <div style={{background: 'rgba(0,0,0,0.3)', padding: 15, borderRadius: 10, marginTop: 20, border: '1px solid rgba(255,255,255,0.05)'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 10}}>
                              <span style={{color: '#e2e8f0', fontSize: 14, fontWeight: 'bold'}}>Review Access Gate <span style={{color: '#fbbf24'}}>(Requires BOTH)</span></span>
                              {unlocked ? <span style={{color: '#34d399', fontWeight: 'bold', fontSize: 14}}>🔓 UNLOCKED</span> : <span style={{color: '#ef4444', fontWeight: 'bold', fontSize: 14}}>🔒 RESTRICTED</span>}
                            </div>
                            
                            <div style={{display: 'flex', gap: 20, alignItems: 'center'}}>
                              <div style={{flex: 1}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af', marginBottom: 5}}>
                                  <span>Reading Progress (Req: {REQUIRED_PERCENTAGE}%)</span>
                                  <span>{Math.round(stats.progress)}%</span>
                                </div>
                                <div style={{width: '100%', background: 'rgba(255,255,255,0.1)', height: 6, borderRadius: 3}}>
                                   <div style={{width: `${Math.min(stats.progress, 100)}%`, background: stats.progress >= REQUIRED_PERCENTAGE ? '#34d399' : '#3b82f6', height: '100%', borderRadius: 3}}></div>
                                </div>
                              </div>
                              
                              <div style={{flex: 1}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af', marginBottom: 5}}>
                                  <span>Time Invested (Req: {REQUIRED_HOURS} Hrs)</span>
                                  <span>{currentHours} / {REQUIRED_HOURS} Hrs</span>
                                </div>
                                <div style={{width: '100%', background: 'rgba(255,255,255,0.1)', height: 6, borderRadius: 3}}>
                                   <div style={{width: `${Math.min((stats.seconds / REQUIRED_SECONDS) * 100, 100)}%`, background: stats.seconds >= REQUIRED_SECONDS ? '#34d399' : '#3b82f6', height: '100%', borderRadius: 3}}></div>
                                </div>
                              </div>
                            </div>
                            {!isRented && !unlocked && <p style={{margin: '10px 0 0 0', color: '#6b7280', fontSize: 13}}>You must rent this book to begin accumulating reading data.</p>}
                         </div>
                       )}

                       {(activeTab === 'reviews' || activeTab === 'home') && (
                         <div style={{borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 15, marginTop: 20}}>
                           <h4 style={{margin: '0 0 15px 0', color: '#e2e8f0', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1}}>Verified Reviews</h4>
                           {parseReviews(b.reviews).length > 0 ? (
                              parseReviews(b.reviews).map((r, i) => <div key={i} style={styles.reviewBubble}>"{r}"</div>)
                            ) : (
                              <div style={{color: '#6b7280', fontStyle: 'italic', fontSize: 14, marginBottom: 15}}>No verified users have logged data for this archive yet.</div>
                            )}
                            
                            {activeTab === 'reviews' && currentUser.role === 'user' && unlocked && (
                               <input placeholder="Authorized: Append your review here... (Press Enter)" onKeyDown={e => { if(e.key === 'Enter') { submitReview(b.id, e.target.value); e.target.value=''; } }} style={{...styles.glassInput, border: '1px solid #34d399', marginTop: 10, marginBottom: 0}} />
                            )}
                         </div>
                       )}

                       {currentUser.role === 'admin' && activeTab === 'marketplace' && (
                          <div style={{ marginTop: 25, padding: 15, background: 'rgba(0,0,0,0.3)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <h5 style={{ margin: '0 0 15px 0', color: '#a5b4fc', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Active Licenses Tracking</h5>
                            {getAllRentals(b.activeRentals).length > 0 ? (
                              getAllRentals(b.activeRentals).map((rental, i) => {
                                const expired = Date.now() > rental.due;
                                return (
                                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div>
                                      <div style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>{rental.user}</div>
                                      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Rented: {new Date(rental.rentTime).toLocaleDateString()}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                                      <span style={{ color: expired ? '#ef4444' : '#34d399', fontWeight: 'bold', fontSize: 13 }}>
                                        {expired ? 'EXPIRED' : `Due: ${new Date(rental.due).toLocaleDateString()}`}
                                      </span>
                                      <button className="fluid-btn neon-red" onClick={() => handleRevoke(b.id, rental.user)} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Revoke</button>
                                    </div>
                                  </div>
                                )
                              })
                            ) : (
                              <div style={{ fontSize: 14, color: '#6b7280' }}>No active rentals for this archive.</div>
                            )}
                          </div>
                        )}
                     </div>
                   </div>
                 </div>
               )
            })}
            {displayedBooks.length === 0 && activeTab === 'home' && <p style={{ color: '#9ca3af', fontSize: 18, marginTop: 20 }}>Your bookshelf is empty. Head to the Marketplace to rent your first book!</p>}
            {displayedBooks.length === 0 && (activeTab === 'marketplace' || activeTab === 'reviews') && <p style={{ color: '#9ca3af', fontSize: 18 }}>No books currently available.</p>}
          </div>
        )}
      </div>

      {viewingFile && (
        <div style={styles.readerFullScreen}>
          <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: 60, background: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 25px', zIndex: 1001, borderBottom: '1px solid #334155'}}>
            <div style={{color: '#34d399', fontWeight: 'bold', fontSize: 18, letterSpacing: 1}}>
               {fileType === 'pdf' ? `Page ${pdfPageNumber} of ${pdfNumPages || '...'}` : 'Digital Reader Engine'}
            </div>
            <button className="fluid-btn neon-red" onClick={closeReader} style={{...styles.btnBase, padding: '8px 20px', fontSize: 14}}>Close Reader</button>
          </div>
          
          <div style={{marginTop: 60, height: 'calc(100vh - 60px)', width: '100vw'}}>
            {fileType === 'epub' ? (
              <div className="hide-epub-arrows" style={{display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', background: '#e2e8f0', padding: '20px 40px', position: 'relative', overflow: 'hidden'}}>
                 <div className="book-page-shadow" style={{flex: 1, width: '100%', maxWidth: '800px', background: '#fff', border: '8px solid #f8fafc', outline: '1px solid #cbd5e1', padding: '20px'}}>
                   <ReactReader 
                      url={viewingFile} 
                      epubInitOptions={{ manager: 'continuous', flow: 'paginated' }}
                      locationChanged={(epubcifi) => {
                        latestEpubLocation.current = epubcifi;
                        if (epubRendition.current && epubRendition.current.book.locations.length() > 0) {
                           const percentage = epubRendition.current.book.locations.percentageFromCfi(epubcifi);
                           highestProgressRef.current = Math.max(highestProgressRef.current, Math.round(percentage * 100));
                        }
                      }} 
                      getRendition={(r) => {
                        r.spread('none'); 
                        epubRendition.current = r;
                        r.book.ready.then(() => {
                           if(!r.book.locations.length()) r.book.locations.generate(1600);
                        });
                      }}
                   />
                 </div>
                 
                 <div style={{display: 'flex', gap: 20, marginTop: 20, zIndex: 10, paddingBottom: 20}}>
                    <button onClick={handleEpubPrev} style={{...styles.btnBase, background: '#0f172a', color: '#fff'}}>◄ Previous Page</button>
                    <button onClick={handleEpubNext} style={{...styles.btnBase, background: '#3b82f6', color: '#fff'}}>Next Page ►</button>
                 </div>
              </div>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', background: '#e2e8f0', padding: '20px 40px', position: 'relative', overflow: 'hidden'}}>
                 <div className={`page-wrapper ${flipAnim} book-page-shadow`} style={{flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'transform 0.25s ease-in-out, opacity 0.25s ease-in-out', perspective: 1500, background: '#fff', border: '8px solid #f8fafc', outline: '1px solid #cbd5e1', padding: '10px'}}>
                   <Document file={viewingFile} onLoadSuccess={({numPages}) => { setPdfNumPages(numPages); highestProgressRef.current = Math.max(highestProgressRef.current, (1 / numPages) * 100); }}>
                      <Page pageNumber={pdfPageNumber} renderTextLayer={false} renderAnnotationLayer={false} />
                   </Document>
                 </div>
                 
                 <div style={{display: 'flex', gap: 20, marginTop: 20, zIndex: 10, paddingBottom: 20}}>
                    <button onClick={handlePdfPrev} disabled={pdfPageNumber <= 1} style={{...styles.btnBase, background: '#0f172a', color: '#fff'}}>◄ Previous Page</button>
                    <button onClick={handlePdfNext} disabled={pdfPageNumber >= pdfNumPages} style={{...styles.btnBase, background: '#3b82f6', color: '#fff'}}>Next Page ►</button>
                 </div>
              </div>
            )}
          </div>
        </div>
      )}
      <style>{fluidStyles}</style>
    </div>
  );
}

const styles = {
  loginContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', height: '100vh', width: '100vw', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #020617 0%, #1e1b4b 100%)', overflow: 'hidden' },
  glassBox: { background: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', padding: '50px 40px', borderRadius: 20, textAlign: 'center', width: 380, border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' },
  glassInput: { width: '100%', padding: '15px 20px', marginBottom: 15, background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 10, color: '#fff', boxSizing: 'border-box', outline: 'none', fontSize: 16, transition: 'border 0.3s' },
  btnBase: { padding: '14px 24px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, border: 'none', fontSize: 15, transition: 'all 0.3s ease', letterSpacing: 0.5 },
  
  dashboard: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', height: '100vh', width: '100vw', background: 'linear-gradient(135deg, #020617 0%, #0f172a 100%)', fontFamily: '"Inter", system-ui, sans-serif', overflow: 'hidden' },
  sidebar: { width: 280, height: '100vh', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(20px)', padding: '40px 25px', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.05)' },
  
  content: { flex: 1, padding: '50px 60px', height: '100vh', overflowY: 'auto' },
  glassCard: { background: 'rgba(30, 41, 59, 0.3)', backdropFilter: 'blur(12px)', padding: 35, borderRadius: 16, border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)', transition: 'transform 0.3s, box-shadow 0.3s' },
  
  reviewBubble: { color: '#e2e8f0', fontSize: 15, marginBottom: 12, background: 'rgba(0,0,0,0.2)', padding: '12px 18px', borderRadius: '0 12px 12px 12px', display: 'inline-block', borderLeft: '3px solid #818cf8', width: '100%', boxSizing: 'border-box' },
  readerFullScreen: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#e2e8f0', display: 'flex', flexDirection: 'column', zIndex: 1000 },
  
  coverImage: { width: 140, height: 210, objectFit: 'cover', borderRadius: 8, boxShadow: '0 10px 20px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 },
  coverFallback: { width: 140, height: 210, borderRadius: 8, background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.5)', flexShrink: 0 },
  
  dot: (color) => ({ height: 8, width: 8, backgroundColor: color, borderRadius: '50%', display: 'inline-block', boxShadow: `0 0 8px ${color}` })
};

const fluidStyles = `
  :root { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
  body, html, #root { margin: 0 !important; padding: 0 !important; width: 100vw !important; height: 100vh !important; overflow: hidden !important; background: #020617; }
  * { box-sizing: border-box; }

  .glow-text { text-shadow: 0 0 20px rgba(255,255,255,0.3); }
  .glassInput:focus { border-color: #818cf8 !important; background: rgba(0,0,0,0.4) !important; }
  
  .fluid-btn { color: #fff; background: rgba(255,255,255,0.1); backdrop-filter: blur(5px); }
  .fluid-btn:hover { transform: translateY(-2px); color: #fff; }
  .fluid-btn:active { transform: translateY(1px); }
  
  .neon-blue:hover { background: #3b82f6; box-shadow: 0 0 20px rgba(59, 130, 246, 0.5); }
  .neon-green:hover { background: #10b981; box-shadow: 0 0 20px rgba(16, 185, 129, 0.5); }
  .neon-red:hover { background: #ef4444; box-shadow: 0 0 20px rgba(239, 68, 68, 0.5); }
  .neon-orange:hover { background: #f59e0b; box-shadow: 0 0 20px rgba(245, 158, 11, 0.5); }
  
  .nav-btn { background: transparent; color: #94a3b8; border: none; padding: 14px 20px; text-align: left; cursor: pointer; border-radius: 10px; margin-bottom: 8px; transition: all 0.3s ease; font-size: 16px; font-weight: 500; }
  .nav-btn:hover { background: rgba(255,255,255,0.05); color: #fff; padding-left: 25px; }
  
  .nav-active { background: linear-gradient(90deg, rgba(59,130,246,0.2) 0%, transparent 100%); color: #60a5fa; border: none; border-left: 4px solid #3b82f6; padding: 14px 16px; text-align: left; cursor: pointer; border-radius: 0 10px 10px 0; margin-bottom: 8px; font-size: 16px; font-weight: 600; }
  
  .book-card:hover { transform: translateY(-5px); box-shadow: 0 15px 35px -10px rgba(0,0,0,0.6); border-color: rgba(255,255,255,0.15) !important; }
  .hover-link:hover { color: #fff !important; }

  .book-page-shadow { box-shadow: 15px 15px 30px rgba(0,0,0,0.2), inset 5px 0 20px rgba(0,0,0,0.05); }
  .hide-epub-arrows button[class*="Arrow"] { display: none !important; pointer-events: none; }
  
  .flip-out-left { transform: rotateY(-90deg) translateX(-50%); opacity: 0; transform-origin: left center; }
  .flip-in-right { transform: rotateY(90deg) translateX(50%); opacity: 0; transform-origin: right center; animation: landPage 0.25s forwards; }
  
  .flip-out-right { transform: rotateY(90deg) translateX(50%); opacity: 0; transform-origin: right center; }
  .flip-in-left { transform: rotateY(-90deg) translateX(-50%); opacity: 0; transform-origin: left center; animation: landPage 0.25s forwards; }
  
  @keyframes landPage {
    to { transform: rotateY(0deg) translateX(0); opacity: 1; }
  }
`;