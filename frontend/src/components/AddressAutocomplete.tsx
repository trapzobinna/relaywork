import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

interface AddressOption {
  display_name: string;
  lat: number;
  lon: number;
  street?: string;
  city?: string;
  state?: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (data: { address: string; lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = 'e.g. 14 Allen Avenue, Ikeja, Lagos',
  className = '',
  required = false,
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<any>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.trim().length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchTerm
        )}&countrycodes=ng&addressdetails=1&limit=5`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'RelayWorkApp/2.0',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const mapped: AddressOption[] = data.map((item: any) => ({
          display_name: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          street: item.address?.road || item.address?.pedestrian || item.address?.suburb,
          city: item.address?.city || item.address?.town || item.address?.county,
          state: item.address?.state,
        }));
        setSuggestions(mapped);
        setIsOpen(mapped.length > 0);
      }
    } catch (err) {
      console.warn('Geocoding notice:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setQuery(text);
    onChange(text);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(text);
    }, 350);
  };

  const handleSelectOption = (option: AddressOption) => {
    setQuery(option.display_name);
    onChange(option.display_name);
    onSelect({
      address: option.display_name,
      lat: option.lat,
      lng: option.lon,
    });
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative flex items-center">
        <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
        <input
          type="text"
          required={required}
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 ${className}`}
        />
        {loading && (
          <Loader2 className="w-4 h-4 text-blue-500 animate-spin absolute right-3.5" />
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden divide-y divide-gray-100 max-h-60 overflow-y-auto text-left">
          {suggestions.map((option, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectOption(option)}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 transition flex items-start space-x-2.5 cursor-pointer text-gray-800"
            >
              <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-gray-900 line-clamp-1">{option.display_name}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {option.lat.toFixed(4)}, {option.lon.toFixed(4)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

