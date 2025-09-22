// FileTransferModal.jsx - Modal for file transfer functionality
import React, { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload, faFile } from '@fortawesome/free-solid-svg-icons';

const FileTransferModal = ({ 
  show, 
  onClose, 
  onFileSelect, 
  isTransferring, 
  transferProgress,
  connectedPeers 
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleStartTransfer = () => {
    if (selectedFile && onFileSelect) {
      onFileSelect(selectedFile);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content file-transfer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <FontAwesomeIcon icon={faUpload} /> Share File
          </h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="modal-body">
          {!isTransferring ? (
            <>
              {!selectedFile ? (
                <div 
                  className={`file-drop-zone ${dragOver ? 'drag-over' : ''}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FontAwesomeIcon icon={faFile} size="3x" />
                  <p>Drop a file here or click to select</p>
                  <p className="file-limit">Maximum file size: 20 MB</p>
                </div>
              ) : (
                <div className="selected-file">
                  <h4>Selected File:</h4>
                  <p className="file-name">{selectedFile.name}</p>
                  <p className="file-size">Size: {formatFileSize(selectedFile.size)}</p>
                  {selectedFile.size > 20 * 1024 * 1024 && (
                    <p className="error-message">⚠️ File is too large. Maximum size is 20 MB.</p>
                  )}
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setSelectedFile(null)}
                  >
                    Choose Different File
                  </button>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              
              <div className="peer-info">
                <p>File will be sent to {connectedPeers.length} connected peer(s)</p>
              </div>
            </>
          ) : (
            <div className="transfer-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${transferProgress}%` }}
                ></div>
              </div>
              <p>Transferring... {transferProgress.toFixed(1)}% complete</p>
              <p className="transfer-note">Text updates are paused during file transfer</p>
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          {!isTransferring ? (
            <>
              <button 
                className="btn btn-primary" 
                onClick={handleStartTransfer}
                disabled={!selectedFile || selectedFile.size > 20 * 1024 * 1024}
              >
                <FontAwesomeIcon icon={faUpload} /> Share File
              </button>
              <button className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
            </>
          ) : (
            <button className="btn btn-secondary" onClick={onClose} disabled>
              Transferring...
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileTransferModal;
