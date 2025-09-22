// App.jsx - TextShareApp component
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './App.css';
import AppHeader from './components/AppHeader.jsx';
import HomeContainer from './components/HomeContainer.jsx';
import TextAreaContainer from './components/TextAreaContainer.jsx';
import ControlsBar from './components/ControlsBar.jsx';
import Footer from './components/Footer.jsx';
import ShareModal from './components/ShareModal.jsx';
import FileTransferModal from './components/FileTransferModal.jsx';
import FileReceiveModal from './components/FileReceiveModal.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import Toast from './components/Toast.jsx';
import './components/FileTransfer.css';
import { useTheme } from './theme/ThemeContext.jsx';
import { useTextManager } from './hooks/useTextManager.js';
import { useDraftManager } from './hooks/useDraftManager.js';
import { useTypingDetection } from './hooks/useTypingDetection.js';
import { useServerPolling } from './hooks/useServerPolling.js';
import { useWebRTCManager } from './utils/WebRTCSocketManager.js';

// Constants
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const LOGO_URL = import.meta.env.VITE_LOGO_URL || '/clippy.png';
const MAX_TEXT_LENGTH = 20000; // Limit text to 20,000 characters (approx. 20KB)
const MAX_STORAGE_SIZE = 4 * 1024 * 1024; // 4MB limit for localStorage

// TextShareApp Component
function TextShareApp() {
  // Get route parameters
  const { id, seedData } = useParams();
  // Helper function to encode text to base64
  const encodeTextToBase64 = (text) => {
    try {
      return btoa(encodeURIComponent(text));
    } catch (e) {
      console.error('Error encoding text to base64:', e);
      return '';
    }
  };
  
  // Helper function to decode base64 to text
  const decodeBase64ToText = (base64) => {
    try {
      return decodeURIComponent(atob(base64));
    } catch (e) {
      console.error('Error decoding base64 to text:', e);
      return '';
    }
  };

  // Theme
  const { isDark } = useTheme();
  const theme = isDark ? 'dark-theme' : 'light-theme';
  
  // Navigation and parameters
  const navigate = useNavigate();
  
  // Typing detection hook
  const { isTyping, isTypingRef, handleTypingStart, cleanup: cleanupTyping } = useTypingDetection();
  
  // State for server and app-level concerns
  const [serverText, setServerText] = useState('');
  const [lastServerText, setLastServerText] = useState('');
  const [loadedFromServer, setLoadedFromServer] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isRtcConnected, setIsRtcConnected] = useState(false);
  const [isRtcPollingPaused, setIsRtcPollingPaused] = useState(false);
  const [isServerOnline, setIsServerOnline] = useState(true);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [socketClients, setSocketClients] = useState(0);
  const [isPollingPausedFromTyping, setIsPollingPausedFromTyping] = useState(false);
  const [isWebRTCActive, setIsWebRTCActive] = useState(false); // Controls UI visibility and polling when WebRTC is connecting/connected
  const [autoUpdate, setAutoUpdate] = useState(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem('autoUpdate');
    return saved !== null ? saved === 'true' : true;
  });
  const [lastChecked, setLastChecked] = useState(null);
  const [updatesAvailable, setUpdatesAvailable] = useState(false);
  const [showDraft, setShowDraft] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info');
  const [showFileTransferModal, setShowFileTransferModal] = useState(false);

  // Ref to store the updateTextFromExternal function for WebRTC
  const updateTextFromExternalRef = useRef(null);

  // WebRTC connection management 
  const {
    rtcSupported,
    rtcConnected,
    connectionStatus,
    activeUsers: webrtcActiveUsers,
    dataChannelStatus,
    broadcastTextToAllPeers,
    sendPresenceAnnouncement,
    setDebugMode,
    clientId,
    webRtcConnectionStage,
    initiatePeerConnections,
    peerDiscoveryEnabled,
    setPeerDiscoveryEnabled,
    startPeerSearch,
    disconnectPeers,
    debugMode,
    debugData,
    sendTextToAllPeers,
    isPollingPaused,
    // File transfer functionality
    fileTransferActive,
    transferProgress,
    incomingFile,
    setIncomingFile,
    fileTransferComplete,
    startFileTransfer,
    saveReceivedFile
  } = useWebRTCManager(
    id,
    '', // Don't pass current text to avoid feedback loops
    () => {}, // Don't pass setText to avoid feedback loops
    () => {}, // Don't pass setSavedText to avoid feedback loops
    () => {}, // Don't pass setServerText to avoid feedback loops
    () => {}, // Don't pass setLastServerText to avoid feedback loops
    () => {}, // Don't pass setHasChanges to avoid feedback loops
    isTypingRef.current,
    (text) => updateTextFromExternalRef.current?.(text)  // Use ref that will be set later
  );
  
  // Text management hook
  const {
    text,
    setText,
    savedText,
    setSavedText,
    hasChanges,
    setHasChanges,
    userEditingRef,
    handleChange,
    updateTextFromExternal,
    markAsSaved,
    resetEditingState,
    cleanup: cleanupTextManager
  } = useTextManager({
    id,
    serverText,
    MAX_TEXT_LENGTH,
    setIsPollingPausedFromTyping,
    handleTypingStart,
    broadcastTextToAllPeers: rtcConnected && !fileTransferActive ? sendTextToAllPeers : null
  });

  // Set the ref for WebRTC to use updateTextFromExternal
  updateTextFromExternalRef.current = updateTextFromExternal;
  
  // Draft management hook
  const {
    draftText,
    setDraftText,
    hasDraft,
    handleDraftChange,
    saveDraft,
    deleteDraft,
    applyDraft,
    loadDraft
  } = useDraftManager({
    id,
    text,
    setText,
    setSavedText,
    setHasChanges,
    MAX_STORAGE_SIZE
  });
  
  // Toggle draft visibility
  const toggleShowDraft = useCallback(() => {
    setShowDraft(prev => !prev);
  }, []);
  
  // Refs for activity tracking
  const lastActivityTimeRef = useRef(Date.now());
  
  // Update our state when WebRTCSocketManager state changes
  useEffect(() => {
    if (rtcConnected !== undefined) {
      setIsRtcConnected(rtcConnected);
    }
  }, [rtcConnected]);
  
  // Update WebRTC active state when peer discovery is enabled or peers are connected
  useEffect(() => {
    // WebRTC is considered "active" when peer discovery is enabled (connecting) or when connected to peers
    const webRTCActive = peerDiscoveryEnabled || rtcConnected;
    setIsWebRTCActive(webRTCActive);
    console.log('WebRTC active state changed:', webRTCActive, { peerDiscoveryEnabled, rtcConnected });
  }, [peerDiscoveryEnabled, rtcConnected]);
  
  useEffect(() => {
    if (isPollingPaused !== undefined) {
      setIsRtcPollingPaused(isPollingPaused);
    }
  }, [isPollingPaused]);
  
  // Save autoUpdate preference
  useEffect(() => {
    localStorage.setItem('autoUpdate', autoUpdate.toString());
  }, [autoUpdate]);
  
  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      cleanupTyping();
      cleanupTextManager();
    };
  }, [cleanupTyping, cleanupTextManager]);

  // WebRTC Socket Manager handles all WebRTC signaling now - no polling needed

  // Track user activity for auto-save and offline detection
  const updateLastActivityTime = useCallback(() => {
    lastActivityTimeRef.current = Date.now();
    
    // If user is active and WebRTC polling was paused due to inactivity, resume
    if (isRtcPollingPaused) {
      console.log('User activity detected, resuming WebRTC polling');
      setIsRtcPollingPaused(false);
    }
  }, [isRtcPollingPaused]);
  
  // Monitor user activity
  useEffect(() => {
    const handleActivity = () => {
      updateLastActivityTime();
    };
    
    // Add event listeners for user activity
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keypress', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('click', handleActivity);
    
    // Set initial activity time
    updateLastActivityTime();
    
    return () => {
      // Clean up event listeners
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, [updateLastActivityTime]);
  
  // Handle save operation
  const handleSave = useCallback(async () => {
    // Skip saving if no changes
    if (!hasChanges || !id) return;
    
    // Skip saving if text is too long
    if (text.length > MAX_TEXT_LENGTH) {
      alert(`Text is too long. Maximum length is ${MAX_TEXT_LENGTH} characters.`);
      return;
    }
    
    const tempText = text;
    
    try {
      const headers = new Headers();
      headers.append('Content-Type', 'application/json');
      
      const response = await fetch(`${API_BASE_URL}/share.php?id=${id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text: tempText })
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        setServerText(tempText);
        setLastServerText(tempText);
        
        // Use our text manager to mark as saved and resume polling
        markAsSaved();
        console.log('Text saved to server');
        
        // Update online status if it was offline
        if (!isServerOnline) {
          setIsServerOnline(true);
        }
        
        // Store in localStorage as backup
        try {
          const key = `clippy_text_${id}`;
          localStorage.setItem(key, encodeTextToBase64(tempText));
          console.log('Text saved to localStorage');
        } catch (e) {
          console.error('Error saving to localStorage:', e);
        }
      } else {
        console.error('Error saving text:', data.message);
      }
    } catch (error) {
      console.error('Error saving text:', error);
      setIsServerOnline(false);
      
      // If the server is offline, still store in localStorage
      try {
        const key = `clippy_text_${id}`;
        localStorage.setItem(key, encodeTextToBase64(tempText));
        console.log('Text saved to localStorage (server offline)');
      } catch (e) {
        console.error('Error saving to localStorage:', e);
      }
    }
  }, [id, text, hasChanges, isServerOnline, markAsSaved]);
  
  // Load text from server
  const loadTextFromServer = useCallback(async () => {
    if (!id) {
      console.error('Cannot load text: No session ID provided');
      console.trace('Stack trace for missing ID');
      return;
    }
    
    // Skip loading if polling is paused due to typing or WebRTC is active
    if (isPollingPausedFromTyping || isWebRTCActive) {
      console.log('Skipping text load from server because polling is paused due to typing or WebRTC is active');
      return;
    }
    
    try {
      console.log(`Loading text from server for session ${id}`);
      
      const response = await fetch(`${API_BASE_URL}/share.php?id=${id}&track=true`);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        console.log('Response text:', await response.text());
        throw new Error('Invalid JSON response from server');
      }
      
      // Check if response contains text (even if status is not explicitly 'success')
      if (data && data.text !== undefined) {
        console.log('Text loaded from server');
        
        // Ensure data.text is defined and not null
        const serverText = data.text || '';
        
        // Update server text state
        setServerText(serverText);
        setLastServerText(serverText);
        
        // Only update the text if we haven't loaded yet or user isn't editing
        if (!loadedFromServer) {
          console.log('Auto-applying server text - first load (loadedFromServer:', loadedFromServer, ')');
          updateTextFromExternal(serverText);
        } else if (serverText !== text) {
          console.log('Server text differs from current text');
          console.log('Server text length:', serverText.length, 'Current text length:', text.length);
          console.log('loadedFromServer:', loadedFromServer, 'userEditingRef.current:', userEditingRef.current);
          console.log('isWebRTCActive:', isWebRTCActive, 'isRtcConnected:', isRtcConnected);
          
          // Update the text area immediately to show the new content
          updateTextFromExternal(serverText);
          
          // Only show toast notification if WebRTC is not active/connected
          if (!isWebRTCActive && !isRtcConnected) {
            // Show toast notification for updates if text has changed
            const serverTextLength = serverText.length;
            const currentTextLength = text.length;
            const diffLength = Math.abs(serverTextLength - currentTextLength);
            
            let updateMessage;
            if (serverTextLength > currentTextLength) {
              updateMessage = `Content updated (+${diffLength} chars)`;
            } else if (serverTextLength < currentTextLength) {
              updateMessage = `Content updated (${diffLength} chars removed.)`;
            } else {
              updateMessage = 'Content modified (same length)';
            }
            
            console.log('Toast message:', updateMessage);
            setToastMessage(updateMessage);
            setToastType('info');
            setShowToast(true);
          } else {
            console.log('WebRTC is active/connected - skipping toast notification');
          }
        } else {
          console.log('No action needed - server text matches current text');
        }
        
        // Mark as loaded
        setLoadedFromServer(true);
        
        // Update online status if it was offline
        if (!isServerOnline) {
          setIsServerOnline(true);
        }
        
        // Store in localStorage as backup
        try {
          const key = `clippy_text_${id}`;
          localStorage.setItem(key, encodeTextToBase64(data.text));
        } catch (e) {
          console.error('Error saving to localStorage:', e);
        }
      } else {
        console.error('Error loading text:', data.message);
      }
    } catch (error) {
      console.error('Error loading text from server:', error);
      setIsServerOnline(false);
      
      // Try to get from localStorage as fallback
      try {
        const key = `clippy_text_${id}`;
        const savedText = localStorage.getItem(key);
        
        if (savedText) {
          const decodedText = decodeBase64ToText(savedText);
          console.log('Text loaded from localStorage (server offline)');
          updateTextFromExternal(decodedText);
          setLoadedFromServer(true);
        }
      } catch (e) {
        console.error('Error loading from localStorage:', e);
      }
    }
  }, [id, text, loadedFromServer, isPollingPausedFromTyping, isWebRTCActive, updateTextFromExternal]);
  
  // Function to apply server updates
  const applyUpdates = useCallback(() => {
    if (serverText !== text) {
      // If there are unsaved changes, offer to save as draft
      if (hasChanges && userEditingRef.current) {
        const saveAsDraft = window.confirm('You have unsaved changes. Would you like to save them as a draft before loading the updates?');
        
        if (saveAsDraft) {
          // Save current text as draft using our hook
          saveDraft();
        }
      }
      
      console.log('Applying server updates');
      updateTextFromExternal(serverText);
      setUpdatesAvailable(false);
      
      // Reset editing state after applying updates
      resetEditingState();
      
      // Only show success toast if WebRTC is not active/connected
      if (!isWebRTCActive && !isRtcConnected) {
        // Ensure the toast stays visible for at least 1 second
        const minimumVisibleTime = 1000; // 1 second
        
        // Change toast message to indicate updates were applied
        setToastMessage('Updates applied successfully');
        setToastType('success');
        
        // Delay hiding the toast to ensure visibility
        setTimeout(() => {
          setShowToast(false);
        }, minimumVisibleTime);
      } else {
        console.log('WebRTC is active/connected - skipping success toast notification');
      }
      
      // Clear any existing reset timer
      if (window.userEditingResetTimer) {
        clearTimeout(window.userEditingResetTimer);
        window.userEditingResetTimer = null;
      }
    }
  }, [serverText, text, hasChanges, userEditingRef, id, updateTextFromExternal, resetEditingState, saveDraft]);
  
  // Add keyboard event listener for Enter key to apply updates
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Apply updates when Enter key is pressed and updates are available
      if (e.key === 'Enter' && updatesAvailable) {
        applyUpdates();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [updatesAvailable, applyUpdates]);
  
  // Initial load effect
  useEffect(() => {
    console.log('Initial load effect triggered, id:', id);
    if (id) {
      // Only load from server if WebRTC is not active to avoid conflicts
      if (!isWebRTCActive) {
        console.log('Initializing text from server for session:', id);
        loadTextFromServer();
      } else {
        console.log('Skipping server load because WebRTC is active');
      }
      
      // If there's seed data, use it
      if (seedData && !loadedFromServer) {
        const initialText = seedData || '';
        console.log('Using seed data for initial text');
        setText(initialText);
        setSavedText(initialText);
        setHasChanges(true);
      }
    } else {
      console.log('No session ID available, not loading text');
    }
  }, [id, seedData, loadedFromServer, isWebRTCActive]); // Removed loadTextFromServer from dependencies to prevent unnecessary re-runs
  
  // Set up server polling using custom hook
  useServerPolling({
    id,
    autoUpdate,
    isPollingPausedFromTyping: isPollingPausedFromTyping || isWebRTCActive, // Pause polling when typing OR when WebRTC is active
    loadTextFromServer,
    serverText,
    text,
    applyUpdates,
    setLastChecked,
    setUpdatesAvailable,
    userEditingRef,
    pollingInterval: 10000 // Check every 10 seconds
  });
  
  // Handle copy to clipboard
  const handleCopy = useCallback(() => {
    if (!navigator.clipboard) {
      alert('Clipboard API not available in your browser');
      return;
    }
    
    navigator.clipboard.writeText(text)
      .then(() => {
        console.log('Text copied to clipboard');
        
        // Flash the UI to indicate success
        const textAreaContainer = document.querySelector('.text-area-container');
        if (textAreaContainer) {
          textAreaContainer.classList.add('copied');
          setTimeout(() => {
            textAreaContainer.classList.remove('copied');
          }, 200);
        }
      })
      .catch(err => {
        console.error('Error copying text to clipboard:', err);
        alert('Failed to copy text to clipboard');
      });
  }, [text]);
  
  // Handle share button click
  const handleShare = useCallback(() => {
    setShowModal(true);
  }, []);
  
  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setShowModal(false);
  }, []);
  
  // Create a new document
  const handleNew = useCallback(() => {
    // Generate a new ID and navigate to it
    const newId = Math.random().toString(16).substring(2, 18);
    navigate(`/${newId}`);
    
    // Reset state
    setText('');
    setSavedText('');
    setServerText('');
    setLastServerText('');
    setHasChanges(false);
    setLoadedFromServer(false);
  }, [navigate]);
  
  // Calculate stats
  const wordCount = text && text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text ? text.length : 0;
  
  // Assemble WebRTC status message
  const getWebRTCStatusMessage = useCallback(() => {
    if (!rtcSupported) {
      return 'WebRTC not supported';
    }
    
    if (rtcConnected) {
      const otherClients = webrtcActiveUsers - 1;
      const clientLabel = otherClients === 1 ? 'client' : 'clients';
      return `Connected via WebRTC\n(${otherClients} other ${clientLabel})`;
    }
    
    if (webRtcConnectionStage === 'connecting') {
      return 'WebRTC connecting...';
    }
    
    if (webRtcConnectionStage === 'discovering') {
      return 'Looking for peers...';
    }
    
    if (webRtcConnectionStage === 'failed') {
      return 'WebRTC connection failed';
    }
    
    return 'WebRTC ready';
  }, [rtcSupported, rtcConnected, webRtcConnectionStage, webrtcActiveUsers]);
  
  // Enable WebRTC Debug
  const handleDebugWebRTC = useCallback(() => {
    // Use WebRTCSocketManager's built-in debug functionality
    setDebugMode(true);
    console.log('WebRTC debug mode enabled');
  }, [setDebugMode]);
  
  // Handle Debug Log Submit
  const handleSubmitDebugLogs = useCallback(() => {
    // Log connection status to console
    console.log('WebRTC debug information:', {
      connectionStatus,
      activeUsers: webrtcActiveUsers,
      rtcSupported,
      rtcConnected,
      webRtcConnectionStage,
      dataChannelStatus
    });
    alert('Debug information has been logged to the console');
  }, [connectionStatus, webrtcActiveUsers, rtcSupported, rtcConnected, webRtcConnectionStage, dataChannelStatus]);
  
  // Handle toast close
  const handleToastClose = useCallback(() => {
    setShowToast(false);
  }, []);

  // File transfer handlers
  const handleShareFile = useCallback(() => {
    if (!rtcConnected || !webrtcActiveUsers > 1) {
      alert('You need to be connected to peers to share files');
      return;
    }
    setShowFileTransferModal(true);
  }, [rtcConnected, webrtcActiveUsers]);

  const handleFileSelect = useCallback((file) => {
    if (file.size > 20 * 1024 * 1024) { // 20MB limit
      alert('File is too large. Maximum size is 20MB.');
      return;
    }
    
    const success = startFileTransfer(file);
    if (success) {
      setShowFileTransferModal(false);
    } else {
      alert('Failed to start file transfer. Make sure you are connected to peers.');
    }
  }, [startFileTransfer]);

  const handleCloseFileTransferModal = useCallback(() => {
    setShowFileTransferModal(false);
  }, []);

  const handleSaveReceivedFile = useCallback(() => {
    saveReceivedFile();
  }, [saveReceivedFile]);

  
  // Render
  return (
    <div className={`app-container ${theme}`}>
      {!id ? (
        // Home/Landing page - no session ID
        <div className="landing-page">
          <div className="app-header landing-header-centered">
            <div className="app-title">
              <img src={LOGO_URL} alt="Clippy Logo" className="app-logo" />
              <h1>Clippy</h1>
              <ThemeToggle />
            </div>
          </div>
          <HomeContainer onNewClick={handleNew} API_BASE_URL={API_BASE_URL} LOGO_URL={LOGO_URL} />
          <Footer />
        </div>
      ) : (
        // App with session ID
        <>
          <AppHeader
            LOGO_URL={LOGO_URL}
            onNew={handleNew}
            showRTCStatus={true}
            rtcStatus={getWebRTCStatusMessage()}
            rtcConnected={isRtcConnected}
            rtcStage={webRtcConnectionStage}
            onDebugWebRTC={handleDebugWebRTC}
            onSubmitDebugLogs={handleSubmitDebugLogs}
            autoUpdate={autoUpdate}
            setAutoUpdate={setAutoUpdate}
            updatesAvailable={updatesAvailable}
            applyUpdates={applyUpdates}
            lastChecked={lastChecked}
            text={text}
            serverText={serverText}
            isRtcConnected={isRtcConnected}
            isWebRTCActive={isWebRTCActive}
          />
          
          <TextAreaContainer
            text={text}
            handleTextChange={handleChange}
            handleDraftChange={handleDraftChange}
            rtcStatus={webRtcConnectionStage}
            isTyping={isTyping}
            draftText={draftText}
            showDraft={showDraft}
            setShowDraft={toggleShowDraft}
            hasDraft={hasDraft}
            deleteDraft={deleteDraft}
            setText={setText}
            setHasChanges={setHasChanges}
            savedText={savedText}
            setStatus={(status) => setHasChanges(status === 'unsaved')}
            saveDraft={saveDraft}
            applyDraft={applyDraft}
            MAX_TEXT_LENGTH={MAX_TEXT_LENGTH}
          />
          
          <ControlsBar
            hasChanges={hasChanges}
            saveText={handleSave}
            isServerOnline={isServerOnline}
            isRtcConnected={isRtcConnected}
            wordCount={wordCount}
            charCount={charCount}
            onSave={handleSave}
            onCopy={handleCopy}
            onShare={handleShare}
            onRefresh={() => {
              // Only refresh from server if WebRTC is not active
              if (!isWebRTCActive) {
                // If typing is happening, we'll save first then load from server
                if (isPollingPausedFromTyping && hasChanges) {
                  handleSave();
                }
                loadTextFromServer();
              } else {
                console.log('Skipping server refresh because WebRTC is active');
              }
            }}
            showRTCControls={rtcSupported}
            rtcSupported={rtcSupported}
            rtcPollingPaused={isRtcPollingPaused}
            rtcStage={webRtcConnectionStage}
            webRtcConnectionStage={webRtcConnectionStage}
            activeUsers={webrtcActiveUsers}
            connectedPeers={Object.keys(dataChannelStatus || {})}
            setShowShareModal={setShowModal}
            isPollingPaused={isRtcPollingPaused || isPollingPausedFromTyping}
            status={hasChanges ? "unsaved" : "saved"}
            isWebRTCActive={isWebRTCActive}
            // WebRTC peer connection functions
            startPeerSearch={startPeerSearch}
            disconnectPeers={disconnectPeers}
            peerDiscoveryEnabled={peerDiscoveryEnabled}
            setPeerDiscoveryEnabled={setPeerDiscoveryEnabled}
            // File transfer
            onShareFile={handleShareFile}
            fileTransferActive={fileTransferActive}
          />
          
          <Footer />
          
          {showModal && (
            <ShareModal
              id={id}
              onClose={handleCloseModal}
              rtcSupported={rtcSupported}
              rtcConnected={isRtcConnected}
            />
          )}
          
          {/* File Transfer Modal */}
          <FileTransferModal
            show={showFileTransferModal}
            onClose={handleCloseFileTransferModal}
            onFileSelect={handleFileSelect}
            isTransferring={fileTransferActive}
            transferProgress={transferProgress}
            connectedPeers={Object.keys(dataChannelStatus || {})}
          />
          
          {/* File Receive Modal */}
          <FileReceiveModal
            show={!!incomingFile}
            onClose={() => setIncomingFile(null)}
            incomingFile={incomingFile}
            transferProgress={transferProgress}
            onSaveFile={handleSaveReceivedFile}
            isComplete={fileTransferComplete}
          />
          
          {/* Toast notification for updates */}
          <Toast 
            message={toastMessage}
            type={toastType}
            show={showToast}
            onClose={handleToastClose}
            duration={5000}
          />
        </>
      )}
    </div>
  );
}

export default TextShareApp;
