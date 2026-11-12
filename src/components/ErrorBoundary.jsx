import React from 'react';

/* 出错时别白屏：把错误显示出来，方便诊断 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[crash]', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.8 }}>
          <div style={{ fontSize: 16, marginBottom: 12 }}>页面出错了</div>
          <div style={{ color: '#b4553f', whiteSpace: 'pre-wrap', marginBottom: 16 }}>
            {String(this.state.error && this.state.error.message)}
          </div>
          <button onClick={() => location.reload()} style={{ padding: '8px 16px' }}>
            刷新
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
