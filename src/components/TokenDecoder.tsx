import React, { useState, useMemo } from 'react';
import styles from './TokenDecoder.module.css';

interface TokenDecoderProps {
  token: string;
  title?: string;
}

interface DecodedToken {
  header: any;
  payload: any;
  signature: string;
}

const TokenDecoder: React.FC<TokenDecoderProps> = ({ token, title = "Decoded JWT Token" }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const decodedToken = useMemo((): DecodedToken | null => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));
      const signature = parts[2];

      return { header, payload, signature };
    } catch (error) {
      console.debug('Failed to decode token:', error);
      return null;
    }
  }, [token]);

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getTokenStatus = (payload: any): { status: string; color: string } => {
    if (!payload.exp) return { status: 'No expiration', color: '#ffa500' };
    
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = payload.exp - now;
    
    if (timeLeft < 0) return { status: 'Expired', color: '#ff4444' };
    if (timeLeft < 300) return { status: 'Expires soon', color: '#ffa500' };
    return { status: 'Valid', color: '#44ff44' };
  };

  if (!decodedToken) {
    return (
      <div className={styles.decoderContainer}>
        <h4>{title}</h4>
        <p className={styles.error}>Unable to decode token</p>
      </div>
    );
  }

  const tokenStatus = getTokenStatus(decodedToken.payload);
  const isPlaceholder = decodedToken.payload.placeholder === true;

  return (
    <div className={styles.decoderContainer}>
      <div className={styles.header}>
        <h4>{title}</h4>
        <button 
          className={styles.toggleButton}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '▼ Hide Details' : '▶ Show Details'}
        </button>
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.label}>Status:</span>
          <span 
            className={styles.status}
            style={{ color: tokenStatus.color }}
          >
            {tokenStatus.status}
          </span>
        </div>
        
        <div className={styles.summaryItem}>
          <span className={styles.label}>User:</span>
          <span className={styles.value}>
            {decodedToken.payload.preferred_username || decodedToken.payload.sub || 'Unknown'}
          </span>
        </div>

        <div className={styles.summaryItem}>
          <span className={styles.label}>Type:</span>
          <span className={styles.value}>
            {isPlaceholder ? '🧪 Placeholder Token' : '🔐 Real Token'}
          </span>
        </div>

        {decodedToken.payload.exp && (
          <div className={styles.summaryItem}>
            <span className={styles.label}>Expires:</span>
            <span className={styles.value}>
              {formatTimestamp(decodedToken.payload.exp)}
            </span>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className={styles.details}>
          <div className={styles.section}>
            <h5>Header</h5>
            <pre className={styles.jsonDisplay}>
              {JSON.stringify(decodedToken.header, null, 2)}
            </pre>
          </div>

          <div className={styles.section}>
            <h5>Payload</h5>
            <pre className={styles.jsonDisplay}>
              {JSON.stringify(decodedToken.payload, null, 2)}
            </pre>
          </div>

          <div className={styles.section}>
            <h5>Signature</h5>
            <div className={styles.signature}>
              {decodedToken.signature}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenDecoder;