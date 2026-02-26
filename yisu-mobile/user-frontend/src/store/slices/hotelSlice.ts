import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import Taro from '@tarojs/taro';
import { Hotel, SearchParams, FilterOptions } from '../../../types/hotel';

interface HotelState {
    hotels: Hotel[];
    filterOptions: FilterOptions | null;
    searchParams: SearchParams;
    hotCities: Array<{ city: string; hotel_count: number }>;
    loading: boolean;
    error: string | null;
    pagination: {
        current: number;
        pageSize: number;
        total: number;
    };
}

const initialState: HotelState = {
    hotels: [],
    filterOptions: null,
    searchParams: {
        rooms: 1,
        adults: 2,
        children: 0,
    },
    hotCities: [],
    loading: false,
    error: null,
    pagination: {
        current: 1,
        pageSize: 10,
        total: 0
    }
};

// 异步Thunk：搜索酒店
export const searchHotels = createAsyncThunk(
    'hotel/search',
    async (params: SearchParams, { rejectWithValue }) => {
        try {
            const { data } = await Taro.request({
                url: 'http://localhost:3000/api/hotels/search',
                method: 'GET',
                data: params,
                header: { 'Content-Type': 'application/json' }
            });
            return data.data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// 异步Thunk：获取筛选选项
export const fetchFilterOptions = createAsyncThunk(
    'hotel/fetchFilters',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await Taro.request({
                url: 'http://localhost:3000/api/hotels/filters',
                method: 'GET'
            });
            return data.data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

const hotelSlice = createSlice({
    name: 'hotel',
    initialState,
    reducers: {
        setSearchParams: (state, action: PayloadAction<Partial<SearchParams>>) => {
            state.searchParams = { ...state.searchParams, ...action.payload };
        },
        resetSearchParams: (state) => {
            state.searchParams = initialState.searchParams;
        },
        clearHotels: (state) => {
            state.hotels = [];
            state.pagination = initialState.pagination;
        }
    },
    extraReducers: (builder) => {
        builder
            // 搜索酒店
            .addCase(searchHotels.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(searchHotels.fulfilled, (state, action) => {
                state.loading = false;
                state.hotels = action.payload.list;
                state.pagination = action.payload.pagination;
                state.searchParams = {
                    ...state.searchParams,
                    ...action.payload.searchParams
                };
            })
            .addCase(searchHotels.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // 获取筛选选项
            .addCase(fetchFilterOptions.fulfilled, (state, action) => {
                state.filterOptions = action.payload;
            })
    }
});

export const { setSearchParams, resetSearchParams, clearHotels } = hotelSlice.actions;
export default hotelSlice.reducer;