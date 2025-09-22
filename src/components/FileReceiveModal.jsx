// FileReceiveModal.jsx - Modal for receiving incoming files
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faFile } from '@fortawesome/free-solid-svg-icons';

const FileReceiveModal = ({ 
  show, 
  onClose, 
  incomingFile, 
  transferProgress, 
  onSaveFile,
  isComplete 
}) => {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!show || !incomingFile) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content file-receive-modal">
        <div className="modal-header">
          <h2>
            <FontAwesomeIcon icon={faDownload} /> Incoming File
          </h2>
          {isComplete && (
            <button className="modal-close" onClick={onClose}>
              ×
            </button>
          )}
        </div>
        
        <div className="modal-body">
          <div className="file-info">
            <FontAwesomeIcon icon={faFile} size="3x" />
            <h4>{incomingFile.name}</h4>
            <p>Size: {formatFileSize(incomingFile.size)}</p>
            <p>From: Peer</p>
          </div>
          
          {!isComplete ? (
            <div className="transfer-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${transferProgress}%` }}
                ></div>
              </div>
              <p>Receiving... {transferProgress.toFixed(1)}% complete</p>
              <p className="transfer-note">Text updates are paused during file transfer</p>
            </div>
          ) : (
            <div className="transfer-complete">
              <p className="success-message">✅ File received successfully!</p>
              <p>You can now save the file to your device.</p>
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          {isComplete ? (
            <>
              <button 
                className="btn btn-primary" 
                onClick={onSaveFile}
              >
                <FontAwesomeIcon icon={faDownload} /> Save File
              </button>
              <button className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </>
          ) : (
            <p className="receiving-text">Receiving file...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileReceiveModal;
