import { render, screen, fireEvent } from '@testing-library/react';

import { AddressSearchInput } from './address-search-input';

const mockSearch = jest.fn();
const mockSelect = jest.fn();
const mockSetQuery = jest.fn();
const mockClear = jest.fn();

const defaultHookReturn = {
  query: '',
  setQuery: mockSetQuery,
  results: [],
  isLoading: false,
  search: mockSearch,
  select: mockSelect,
  selectedResult: null,
  clear: mockClear,
};

jest.mock('@/hooks/use-address-search', () => ({
  useAddressSearch: jest.fn(() => defaultHookReturn),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useAddressSearch } = require('@/hooks/use-address-search');

const mockResults = [
  {
    displayName: 'Bangkok',
    formattedAddress: 'Bangkok, Thailand',
    city: 'Bangkok',
    country: 'Thailand',
    latitude: 13.7563,
    longitude: 100.5018,
  },
  {
    displayName: 'Bangna',
    formattedAddress: 'Bangna, Bangkok, Thailand',
    city: 'Bangkok',
    country: 'Thailand',
    latitude: 13.6667,
    longitude: 100.6,
  },
];

describe('AddressSearchInput', () => {
  const onSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAddressSearch as jest.Mock).mockReturnValue(defaultHookReturn);
  });

  it('should render input', () => {
    render(<AddressSearchInput onSelect={onSelect} />);

    expect(screen.getByTestId('address-search-input')).toBeInTheDocument();
  });

  it('should call search on Enter key press', () => {
    (useAddressSearch as jest.Mock).mockReturnValue({
      ...defaultHookReturn,
      query: 'Bangkok',
    });

    render(<AddressSearchInput onSelect={onSelect} />);

    fireEvent.keyDown(screen.getByTestId('address-search-input'), {
      key: 'Enter',
    });
    expect(mockSearch).toHaveBeenCalled();
  });

  it('should display results dropdown when results exist', () => {
    (useAddressSearch as jest.Mock).mockReturnValue({
      ...defaultHookReturn,
      results: mockResults,
    });

    render(<AddressSearchInput onSelect={onSelect} />);

    expect(screen.getByTestId('address-search-results')).toBeInTheDocument();
  });

  it('should call select when a result is clicked', () => {
    (useAddressSearch as jest.Mock).mockReturnValue({
      ...defaultHookReturn,
      results: mockResults,
    });

    render(<AddressSearchInput onSelect={onSelect} />);

    fireEvent.click(screen.getByTestId('address-search-result-0'));
    expect(mockSelect).toHaveBeenCalledWith(mockResults[0]);
  });

  it('should show displayName and formattedAddress in results', () => {
    (useAddressSearch as jest.Mock).mockReturnValue({
      ...defaultHookReturn,
      results: mockResults,
    });

    render(<AddressSearchInput onSelect={onSelect} />);

    expect(screen.getByText('Bangkok')).toBeInTheDocument();
    expect(screen.getByText('Bangkok, Thailand')).toBeInTheDocument();
    expect(screen.getByText('Bangna')).toBeInTheDocument();
    expect(
      screen.getByText('Bangna, Bangkok, Thailand'),
    ).toBeInTheDocument();
  });
});
