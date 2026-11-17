import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#FFFDF9]">
          <div className="max-w-md w-full glass-card rounded-2xl p-6 text-center space-y-4 border border-[#F7CBC6]">
            <div className="w-12 h-12 mx-auto rounded-xl bg-[#FFE4E1] flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-[#B03B3B]" />
            </div>
            <h1 className="text-lg font-bold text-[#2B2438]">
              Something went wrong while syncing
            </h1>
            <p className="text-xs text-[#5E556E] break-words">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6F5C96] text-white text-sm font-bold hover:bg-[#5E4C84] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reload App</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
