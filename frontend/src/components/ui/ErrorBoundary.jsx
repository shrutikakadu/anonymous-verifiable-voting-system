import { Component } from 'react';

// Stops one broken page from blanking the whole app.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('UI error:', error && error.message);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="container">
          <div className="card">
            <h2>Something went wrong</h2>
            <p className="v-muted">This page hit an unexpected error. Reload it, or go back to the home page.</p>
            <button type="button" onClick={() => window.location.assign('/')}>Back to home</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
