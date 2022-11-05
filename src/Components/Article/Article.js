import './Article.css'
import { NavLink } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import ReactMarkdown from 'react-markdown'
import { SelectComments, addArticleIDForComments, preloadCommentsForArticle, loadAllCommentsForArticle, setDisplayHowManyComments, loadAdditionalCommentsForArticle } from './articleSlice';
import { useEffect } from 'react';
import voteArrow from './voteArrow.svg';
import Comment from '../Comment/Comment';

import { formatTime, decodeURL, extraFormatMarkdown, grabLink } from '../../features/formatting'
import { loadSubredditPage, setSelectedSubreddit } from '../SubredditsBar/subredditsBarSlice';
import { unwrapResult } from '@reduxjs/toolkit';

function decodeHTML (html) {
    const text = document.createElement('textarea');
    text.innerHTML = html;
    return text.value;
}

function renderMedia (type, articleData) {
    //render text articles like r/AskReddit
    if (!type && articleData.selftext) {
        let { selftext } = articleData;
        if (articleData.selftext.includes('http')) {
            selftext = extraFormatMarkdown(selftext)
        }
        return (
            <ReactMarkdown children={selftext}></ReactMarkdown>
        )
    }
    //render embedded media like tweets
    if (!type && articleData.media_embed.content) {
        const decodedHTML = decodeHTML(articleData.media_embed.content);
        return <div dangerouslySetInnerHTML={{__html: decodedHTML}} />
    }
    //render image posts with more than 1 image
    if (!type && !articleData.selftext && articleData.url.includes('/gallery')) {
        const baseURL = 'https://www.redditmedia.com'
        const permalink = articleData.permalink;
        const decodedHTML = decodeHTML()
        return (
            <div className="article-link-and-frame">
                <iframe className='embedded-gallery' src={`${baseURL}${permalink}?ref_source=embed&ref=share&embed=true`} sandbox="allow-scripts allow-same-origin allow-popups"></iframe>
            </div>
        )






        
    //render links (video links or website links)
    } else if (type === "link") {
        if (articleData.preview.reddit_video_preview) {
            return (
                <video controls autoPlay muted loop>
                    <source src={articleData.preview.reddit_video_preview.fallback_url} type="video/mp4"/>
                </video>
            )
        }
        //attempts to create an article preview iframe
        else {
            return (
                <div className="article-link-and-frame">
                    <a className='article-text out-link' href={articleData.url} target="_blank">{articleData.url}</a>
                    <iframe className="iframes" name={`${articleData.id}-iframe`} id={`${articleData.id}-iframe`} src={ articleData.url }></iframe>
                </div>
            )
        }
    } else if (type === 'self' && articleData.selftext.includes('http') && !articleData.selftext.includes('reddit.com')) {
        const formattedData = extraFormatMarkdown(articleData.selftext)
        return <ReactMarkdown children={formattedData} />
    //render images
    }  else if (type === "image") {
        return (
                <img src={articleData.url} alt={articleData.title} onClick={popoutImage}/>
        )
    //render videos hosted on Reddit
    } else if (type === "hosted:video") {
        return (
            <video controls autoPlay muted loop>
                <source src={articleData.media.reddit_video.fallback_url} type="video/mp4" />
            </video>
        )
    //render embedded media like videos/gifs
    } else if (type === "rich:video") {
        const decodedHTML = decodeHTML(articleData.media_embed.content);
        return <div className="embedded-content" dangerouslySetInnerHTML={{__html: decodedHTML}} />
    }
}

function renderComments (comments, timeRightNow) {
    const commentsArray = [];

    if (comments && comments.commentsList) {
        const commentsList = comments.commentsList;
        for (let comment of Object.keys(commentsList)) {
            if (commentsList[comment] !== null && commentsArray.length < comments.displayHowManyComments && commentsArray.length < comments.commentsLoaded && commentsList[comment]) {
                commentsArray.push(commentsList[comment]);
            }
        }
        return commentsArray.map(comment => {
            const timeSinceComment = formatTime(comment.created, timeRightNow)
            return <Comment key={comment.id} data={comment} timeSinceComment={timeSinceComment} voteArrow={voteArrow}/>
        })
    }
}





function popoutImage ({target}) {
    const poppedOutDiv = document.getElementById('popped-out-container');
    console.log(poppedOutDiv)
    const imageToPopOut = document.createElement('img');
    poppedOutDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.75)'
    poppedOutDiv.style.zIndex = '100'
    imageToPopOut.src = target.src;
    imageToPopOut.className = 'popped-out-child';
    imageToPopOut.style.zIndex = '101';
    if (imageToPopOut.naturalHeight > imageToPopOut.naturalWidth && imageToPopOut.naturalWidth/imageToPopOut.naturalHeight < window.innerWidth / window.innerHeight) {
        imageToPopOut.style.height = "95%";
    } else {
        imageToPopOut.style.width = "95%";
    }
    poppedOutDiv.appendChild(imageToPopOut);
}


export default function Article ({articleData}) {
    const dispatch = useDispatch();
    const timeRightNow = Date.now();
    const timeSincePost = formatTime(articleData.created, timeRightNow);
    const votes = articleData.score >= 1000 ? `${(articleData.score / 1000).toFixed(1)}k` : articleData.score;
    const comments = SelectComments(`t3_${articleData.id}`);
    


    function showMoreComments () {
        const currentNumComments = comments ? comments.displayHowManyComments : 0;
        const newNum = currentNumComments + 3;
        if (!comments.allCommentsLoaded) {
            dispatch(loadAllCommentsForArticle(articleData.permalink))
        }
        
        if (comments && comments.commentsList) {
            if (comments.allCommentsLoaded && comments.displayHowManyComments + 15 >= comments.commentsLoaded) {
                const moreCommentsArray = [];
                for (let comment of Object.keys(comments.commentsList)) {
                    if (comments.commentsList[comment] === null && moreCommentsArray.length < Math.max(15, (comments.displayHowManyComments - comments.commentsLoaded)+15 )) {
                        moreCommentsArray.push(comment);
                    }
                }
                if (moreCommentsArray.length > 0) {
                    dispatch(loadAdditionalCommentsForArticle({subreddit: articleData.subreddit, articleID: articleData.id, commentIDArray: moreCommentsArray})).then(unwrapResult)
                    .then(originalPromiseResult => {})
                    .catch(rejected => {console.log(rejected)});
                }
            }
        }

        dispatch(setDisplayHowManyComments({displayHowManyComments: newNum, comments: comments}))
    }

    function hideComments () {
        dispatch(setDisplayHowManyComments({displayHowManyComments: 0, comments: comments}));
        document.getElementById(articleData.id).scrollIntoView(true);
    }


    useEffect(() => {
        if(articleData.post_hint === 'link' || articleData.post_hint === 'self' || !articleData.post_hint) {
            dispatch(addArticleIDForComments(articleData.id));
            dispatch(preloadCommentsForArticle(articleData.permalink));
        } else {
            dispatch(addArticleIDForComments(articleData.id));
        }
    }, [dispatch, articleData])

    function handleSubredditLinkClick (event) {
        dispatch(loadSubredditPage(event.target.id.slice(0, event.target.id.length-13)));
        dispatch(setSelectedSubreddit(event.target.id.slice(0, event.target.id.length-13)));
    }

    return (
        <div className="article" id={articleData.id}>
            <div id={`${articleData.id}-article-shadow`}></div>
            <div className="article-inner-container">
                <div className='article-subheader'><h4><NavLink id={`/r/${articleData.subreddit}/-article-link`} onClick={handleSubredditLinkClick}>r/{articleData.subreddit}</NavLink> by u/{articleData.author} - {timeSincePost[0]} {timeSincePost[1]} ago </h4></div>
                    
                <div className="article-header">
                    <h2 className='no-margin'>{decodeURL(articleData.title)}</h2>
                </div>
    
                    
                <div className="article-body">
                    {renderMedia(articleData.post_hint, articleData)}
                </div>

                <div className="article-comments">
                    {renderComments(comments, timeRightNow)}
                </div>
                {(comments && comments.commentsList) ? (comments.displayHowManyComments > 0 ? <div id="hide-comments" onClick={hideComments}>^</div> : undefined) : undefined}
                <div id={`${articleData.id}-article-actions`} className="article-actions">
                        <div className='no-margin votes-action'>
                            <p className='no-margin'><img className="vote-arrow" src={voteArrow} alt="upvote"/>{votes} <img className="vote-arrow rotate180" src={voteArrow} alt="downvote"/></p>
                        </div>
                        <p className='no-margin action-comments' onClick={showMoreComments}>{commentCount(comments)}</p>
                </div>
            </div>
        </div>
    )    
}

function commentCount (comments) {
    let phrase;

    if (comments && comments.commentsList) {
        if (comments.displayComments !== 0) {
            phrase = `More comments (${Object.keys(comments.commentsList).length})`
        } 
        if (comments.displayHowManyComments > comments.commentsLoaded && comments.displayHowManyComments) {
            phrase = `Showing all comments (${Object.keys(comments.commentsList).length})`;
        }
    } else {
        phrase = `Show comments`;
    }
    return phrase;
}

