import { renderHook, act } from '@testing-library/react';
import { useAddressSearch } from './use-address-search';

const mockGet = jest.fn();
jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { get: (...args: unknown[]) => mockGet(...args) },
}));

describe('useAddressSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useAddressSearch());

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.selectedResult).toBeNull();
  });

  it('should update query via setQuery', () => {
    const { result } = renderHook(() => useAddressSearch());

    act(() => {
      result.current.setQuery('Bangkok');
    });

    expect(result.current.query).toBe('Bangkok');
  });

  it('should not search when query is empty or whitespace', async () => {
    const { result } = renderHook(() => useAddressSearch());

    await act(async () => {
      await result.current.search();
    });

    expect(mockGet).not.toHaveBeenCalled();

    act(() => {
      result.current.setQuery('   ');
    });

    await act(async () => {
      await result.current.search();
    });

    expect(mockGet).not.toHaveBeenCalled();
  });

  it('should call API and set results on successful search', async () => {
    const mockResults = [
      {
        displayName: 'Bangkok',
        formattedAddress: 'Bangkok, Thailand',
        city: 'Bangkok',
        country: 'Thailand',
        latitude: 13.7563,
        longitude: 100.5018,
      },
    ];

    mockGet.mockResolvedValueOnce({ data: { results: mockResults } });

    const { result } = renderHook(() => useAddressSearch());

    act(() => {
      result.current.setQuery('Bangkok');
    });

    await act(async () => {
      await result.current.search();
    });

    expect(result.current.results).toEqual(mockResults);
    expect(mockGet).toHaveBeenCalledWith('/maps/address/search', {
      params: { query: 'Bangkok', language: 'en' },
    });
  });

  it('should set empty results on API error', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useAddressSearch());

    act(() => {
      result.current.setQuery('Bangkok');
    });

    await act(async () => {
      await result.current.search();
    });

    expect(result.current.results).toEqual([]);
  });

  it('should set isLoading during search', async () => {
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockGet.mockReturnValueOnce(promise);

    const { result } = renderHook(() => useAddressSearch());

    act(() => {
      result.current.setQuery('Bangkok');
    });

    let searchPromise: Promise<void>;
    act(() => {
      searchPromise = result.current.search();
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePromise!({ data: { results: [] } });
      await searchPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should select a result and call onSelect callback', () => {
    const onSelect = jest.fn();
    const { result } = renderHook(() => useAddressSearch(onSelect));

    const mockResult = {
      displayName: 'Bangkok',
      formattedAddress: 'Bangkok, Thailand',
      city: 'Bangkok',
      country: 'Thailand',
      latitude: 13.7563,
      longitude: 100.5018,
    };

    act(() => {
      result.current.select(mockResult);
    });

    expect(result.current.selectedResult).toEqual(mockResult);
    expect(result.current.results).toEqual([]);
    expect(result.current.query).toBe('Bangkok');
    expect(onSelect).toHaveBeenCalledWith(mockResult);
  });

  it('should clear all state', () => {
    const { result } = renderHook(() => useAddressSearch());

    act(() => {
      result.current.setQuery('Bangkok');
    });

    act(() => {
      result.current.clear();
    });

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.selectedResult).toBeNull();
  });

  it('should trim query before sending to API', async () => {
    mockGet.mockResolvedValueOnce({ data: { results: [] } });

    const { result } = renderHook(() => useAddressSearch());

    act(() => {
      result.current.setQuery('  Bangkok  ');
    });

    await act(async () => {
      await result.current.search();
    });

    expect(mockGet).toHaveBeenCalledWith('/maps/address/search', {
      params: { query: 'Bangkok', language: 'en' },
    });
  });
});
