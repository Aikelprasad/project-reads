import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

export default function App() {
  const [username, setUsername] = useState('aikel_secure');
  const [password, setPassword] = useState('mypassword123');
  const [token, setToken] = useState(null);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState('inventory'); 

  // New Book State
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newCopies, setNewCopies] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const API_URL = 'http://localhost:8080/api';

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!response.ok) throw new Error('Login Failed');
      const jwtToken = await response.text();
      setToken(jwtToken);
      fetchBooks(jwtToken);
    } catch (error) {
      Alert.alert('Network Error', 'Check connection to Spring Boot.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBooks = async (jwt) => {
    try {
      const response = await fetch(`${API_URL}/books/all`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      const data = await response.json();
      setBooks(data);
    } catch (error) {
      console.error(error);
    }
  };

  // --- NEW: Select File Logic ---
  const handlePickDocument = async () => {
    let result = await DocumentPicker.getDocumentAsync({
      type: '*/*', // Accepts any file (EPUB, PDF, etc.)
      copyToCacheDirectory: true
    });
    if (!result.canceled) {
      setSelectedFile(result.assets[0]);
    }
  };

  // --- NEW: Upload to Spring Boot Logic ---
  const handleUploadBook = async () => {
    if (!newTitle || !newAuthor || !newCopies || !selectedFile) {
      Alert.alert('Missing Info', 'Please fill all fields and attach a file.');
      return;
    }
    
    setUploading(true);
    const formData = new FormData();
    formData.append('title', newTitle);
    formData.append('author', newAuthor);
    formData.append('availableCopies', newCopies);
    
    // Package the file for transit
    formData.append('file', {
      uri: selectedFile.uri,
      name: selectedFile.name,
      type: selectedFile.mimeType || 'application/octet-stream'
    });

    try {
      const response = await fetch(`${API_URL}/books/add`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
          // Do NOT set Content-Type here; fetch handles the multipart boundary automatically
        },
        body: formData
      });
      
      if (!response.ok) throw new Error('Upload Failed');
      
      Alert.alert('Success', 'File uploaded and saved to database!');
      
      // Reset form and refresh inventory
      setNewTitle(''); setNewAuthor(''); setNewCopies(''); setSelectedFile(null);
      setActiveView('inventory');
      fetchBooks(token);
    } catch (error) {
      Alert.alert('Error', 'Failed to push file to server.');
    } finally {
      setUploading(false);
    }
  };

  if (token) {
    return (
      <View style={styles.dashboardContainer}>
        {/* Sidebar */}
        <View style={styles.sidebar}>
          <Text style={styles.logoText}>Project Reads</Text>
          <View style={styles.divider} />
          
          <TouchableOpacity style={[styles.navItem, activeView === 'inventory' && styles.navItemActive]} onPress={() => setActiveView('inventory')}>
            <Text style={[styles.navText, activeView === 'inventory' && styles.navTextActive]}>Library Inventory</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.navItem, activeView === 'addBook' && styles.navItemActive]} onPress={() => setActiveView('addBook')}>
            <Text style={[styles.navText, activeView === 'addBook' && styles.navTextActive]}>+ Add New File</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.logoutBtn} onPress={() => setToken(null)}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        {/* Main Content Area */}
        <View style={styles.contentArea}>
          <Text style={styles.contentHeader}>
            {activeView === 'inventory' ? 'Current Inventory' : 'Upload File to System'}
          </Text>
          
          {activeView === 'inventory' && (
            <FlatList
              data={books}
              keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
              renderItem={({ item }) => (
                <View style={styles.bookCard}>
                  <View style={styles.bookInfo}>
                    <Text style={styles.bookTitle}>{item.title}</Text>
                    <Text style={styles.bookAuthor}>Author: {item.author}</Text>
                    <Text style={styles.bookStock}>Available: {item.availableCopies}</Text>
                  </View>
                </View>
              )}
            />
          )}

          {activeView === 'addBook' && (
             <View style={styles.uploadForm}>
                <TextInput style={styles.inputField} value={newTitle} onChangeText={setNewTitle} placeholder="Book Title" />
                <TextInput style={styles.inputField} value={newAuthor} onChangeText={setNewAuthor} placeholder="Author Name" />
                <TextInput style={styles.inputField} value={newCopies} onChangeText={setNewCopies} placeholder="Number of Copies" keyboardType="numeric" />
                
                <TouchableOpacity style={styles.fileBtn} onPress={handlePickDocument}>
                  <Text style={styles.fileBtnText}>
                    {selectedFile ? `File Attached: ${selectedFile.name}` : 'Browse Local Files...'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.primaryBtn} onPress={handleUploadBook} disabled={uploading}>
                  {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Execute Upload Pipeline</Text>}
                </TouchableOpacity>
             </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.loginContainer}>
      <View style={styles.loginBox}>
        <Text style={styles.loginTitle}>System Access</Text>
        <TextInput style={styles.inputField} value={username} onChangeText={setUsername} placeholder="Admin Username" />
        <TextInput style={styles.inputField} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
        <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Secure Login</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loginContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#e2e8f0' },
  loginBox: { backgroundColor: '#ffffff', padding: 40, borderRadius: 12, width: '90%', maxWidth: 400, boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)' },
  loginTitle: { fontSize: 26, fontWeight: '800', color: '#1e293b', marginBottom: 30, textAlign: 'center' },
  inputField: { backgroundColor: '#f1f5f9', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#cbd5e1', fontSize: 16 },
  primaryBtn: { backgroundColor: '#0f172a', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  primaryBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  dashboardContainer: { flex: 1, flexDirection: 'row', backgroundColor: '#f8fafc' },
  sidebar: { width: 250, backgroundColor: '#0f172a', paddingVertical: 30, paddingHorizontal: 20, justifyContent: 'flex-start' },
  logoText: { color: '#ffffff', fontSize: 22, fontWeight: '800', letterSpacing: 1, marginBottom: 20 },
  divider: { height: 1, backgroundColor: '#334155', marginBottom: 20 },
  navItem: { paddingVertical: 12, paddingHorizontal: 15, borderRadius: 8, marginBottom: 5 },
  navItemActive: { backgroundColor: '#3b82f6' },
  navText: { color: '#94a3b8', fontSize: 15, fontWeight: '600' },
  navTextActive: { color: '#ffffff' },
  logoutBtn: { marginTop: 'auto', padding: 15, backgroundColor: '#ef4444', borderRadius: 8, alignItems: 'center' },
  logoutText: { color: '#ffffff', fontWeight: 'bold' },
  contentArea: { flex: 1, padding: 40 },
  contentHeader: { fontSize: 28, fontWeight: '700', color: '#1e293b', marginBottom: 30 },
  bookCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: 20, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  bookInfo: { flex: 1 },
  bookTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  bookAuthor: { fontSize: 14, color: '#64748b', marginTop: 4 },
  bookStock: { fontSize: 14, color: '#10b981', marginTop: 8, fontWeight: '700' },
  uploadForm: { backgroundColor: '#ffffff', padding: 30, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', maxWidth: 600 },
  fileBtn: { backgroundColor: '#cbd5e1', padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 20, borderStyle: 'dashed', borderWidth: 2, borderColor: '#94a3b8' },
  fileBtnText: { color: '#334155', fontSize: 15, fontWeight: '600' }
});