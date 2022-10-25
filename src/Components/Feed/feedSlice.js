import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const loadFeedItems = createAsyncThunk(
    'feed/loadPosts',
    async () => {
        const response = await fetch('https://www.reddit.com/.json');
        const jsonResponse = await response.json();
        return jsonResponse.data.children;
    }
)



export const feedSlice = createSlice({
    name: 'feed',
    initialState: {
        articles: [],
        articlesLoading: false,
        articleHasError: false,
        commentsLoading: false,
        commentsHaveError: false,
    },
    reducers: {
    },
    extraReducers: {
        [loadFeedItems.pending]: (state, action) => {
            state.isLoading = true;
            state.hasError = false;
        },
        [loadFeedItems.fulfilled]: (state, action) => {
            state.articles = action.payload;
            console.log(action.payload);
            state.isLoading = false;
            state.hasError = false;
        },
        [loadFeedItems.rejected]: (state, action) => {
            state.isLoading = false;
            state.hasError = true;
        },
    }
})


export const selectArticles = (state) => state.feed.articles;
export const selectIsLoadingArticles = (state) => state.feed.articlesLoading;

export default feedSlice.reducer;