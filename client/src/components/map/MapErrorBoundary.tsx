import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class MapErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[MapErrorBoundary] map crashed:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full w-full items-center justify-center rounded-xl bg-red-50 p-6 text-center text-sm text-red-800">
          <div>
            <p className="font-semibold">Peta gagal di-load.</p>
            <p className="mt-1 text-xs opacity-75">{this.state.error.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
