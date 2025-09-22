import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faSync, faShare, faUserPlus, faUserMinus, faUsers, faUpload } from '@fortawesome/free-solid-svg-icons';
import './ControlsBar.css'; // Import the CSS for WebRTC status styles

/**
 * ControlsBar component displays the main control buttons and status information
 * including save button, check updates button, share button, connect to peers button,
 * and WebRTC connection status.
 */
const ControlsBar = ({
  hasChanges,
  saveText,
  activeUsers,
  onRefresh,
  setShowShareModal,
  status,
  lastSaved,
  rtcSupported,
  isRtcConnected,
  connectedPeers,
  isPollingPaused,
  lastChecked,
  updatesAvailable,
  webRtcConnectionStage,
  startPeerSearch,
  disconnectPeers,
  peerDiscoveryEnabled,
  setPeerDiscoveryEnabled,
  isWebRTCActive, // Hide check updates button when WebRTC is connecting/connected
  onShareFile, // File transfer function
  fileTransferActive // Whether file transfer is in progress
}) => {
  // Function to get WebRTC status message based on the connection stage
  const getRtcStatusMessage = () => {
    switch(webRtcConnectionStage) {
      case 'initializing':
        return '⏳ Initializing WebRTC...';
      case 'discovering':
        return '🔍 Discovering peers';
      case 'connecting':
        return '⏳ Connecting';
      case 'partially-connected':
        return '⚡ Partially connected';
      case 'fully-connected':
        return '⚡ Connected via WebRTC';
      case 'failed':
        return '❌ Connection failed';
      case 'waiting':
        return '⏸ Waiting for peers';
      default:
        return '⏳ WebRTC status: ' + webRtcConnectionStage;
    }
  };

  // Function to get the CSS class for the WebRTC status
  const getRtcStatusClass = () => {
    if (webRtcConnectionStage === 'fully-connected' || webRtcConnectionStage === 'partially-connected') {
      return 'rtc-connected';
    } else if (webRtcConnectionStage === 'failed') {
      return 'rtc-failed';
    } else {
      return 'rtc-connecting';
    }
  };
  return (
    <div className="controls-bar">
      <div className="button-group">
        <button 
          className={`save-button ${hasChanges ? 'has-changes' : ''}`} 
          onClick={saveText}
          disabled={!hasChanges}
          title={activeUsers > 1 ? "Save the current state to the server permanently" : "Save your changes to the server"}
        >
          <FontAwesomeIcon icon={faSave} className="button-icon" /> 
          {activeUsers > 1 ? "Save Permanently" : "Save Changes"}
        </button>
        
        {!isWebRTCActive && (
          <button 
            className="check-updates-button"
            onClick={onRefresh}
            title="Check for updates now"
          >
            <FontAwesomeIcon icon={faSync} className="button-icon" /> Check Updates
          </button>
        )}
        
        <button 
          className="share-toggle-button"
          onClick={() => setShowShareModal(true)}
        >
          <FontAwesomeIcon icon={faShare} className="button-icon" /> Share
        </button>
        
        {/* File transfer button - only show when connected to peers */}
        {rtcSupported && isRtcConnected && connectedPeers.length > 0 && (
          <button 
            className="file-share-button"
            onClick={onShareFile}
            disabled={fileTransferActive}
            title={fileTransferActive ? "File transfer in progress..." : "Share a file with connected peers"}
          >
            <FontAwesomeIcon icon={faUpload} className="button-icon" /> 
            {fileTransferActive ? 'Transferring...' : 'Share File'}
          </button>
        )}
        
        {rtcSupported && (
          <button 
            className={`peer-connection-button ${peerDiscoveryEnabled ? 'discovery-enabled' : ''}`}
            onClick={peerDiscoveryEnabled ? disconnectPeers : startPeerSearch}
            title={peerDiscoveryEnabled ? "Disconnect from peers" : "Connect to peers for real-time collaboration"}
          >
            <FontAwesomeIcon icon={peerDiscoveryEnabled ? faUserMinus : faUserPlus} className="button-icon" /> 
            {peerDiscoveryEnabled ? "Disconnect Peers" : "Connect to Peers"}
          </button>
        )}
      </div>
      
      <div className="status">
        {/* Document status section */}
        {status === 'saved' ? (
          <>
            <span className="status-saved">✓ Saved</span>
            {lastSaved && <span className="last-saved"> at {lastSaved.toLocaleTimeString()}</span>}
          </>
        ) : status === 'saving' ? (
          <span className="status-saving">Saving...</span>
        ) : status === 'error' ? (
          <span className="status-error">Error saving!</span>
        ) : status === 'updated' ? (
          <span className="status-updated">✓ Updates applied</span>
        ) : hasChanges ? (
          <span className="status-unsaved">Unsaved changes</span>
        ) : (
          <span className="status-idle">No changes</span>
        )}
        
        {/* WebRTC connection status section */}
        {rtcSupported && isRtcConnected && (
          <span className="rtc-status">
            · <span className={getRtcStatusClass()}>{getRtcStatusMessage()}</span> 
            <FontAwesomeIcon icon={faUsers} /> 
            ({connectedPeers.length} other client{connectedPeers.length !== 1 ? 's' : ''})
          </span>
        )}
        
        {/* WebRTC connection status when trying to connect */}
        {rtcSupported && !isRtcConnected && (
          <span className="rtc-status">
            · <span className={getRtcStatusClass()}>{getRtcStatusMessage()}</span>
            {activeUsers > 1 && 
              <span className="active-users-count"> · {activeUsers} active user{activeUsers !== 1 ? 's' : ''}</span>
            }
            {webRtcConnectionStage === 'discovering' && 
              <span className="discovery-status"> · Looking for peers...</span>
            }
            {webRtcConnectionStage === 'connecting' && 
              <span className="connecting-status"> · Establishing connection...</span>
            }
            {webRtcConnectionStage === 'failed' && 
              <span className="failed-status"> · Try clicking "Connect to Peers" again</span>
            }
          </span>
        )}
        
        {/* Poll status when WebRTC not connected */}
        {lastChecked && !isRtcConnected && !isPollingPaused && (
          <span className="last-checked"> · Last checked: {lastChecked.toLocaleTimeString()}{!updatesAvailable && ' (no updates)'}</span>
        )}
        {!isRtcConnected && !isWebRTCActive && isPollingPaused && (
          <span className="polling-paused"> · Polling paused (click Save to resume)</span>
        )}
      </div>
    </div>
  );
};

export default ControlsBar;
