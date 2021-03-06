#!/usr/bin/env node

const fs = require( 'fs' );
const path = require( 'path' );

const pkg = require( path.join( __dirname, 'package.json' ) );

const program = require( 'commander' );

const Twitter = require( 'twitter' );
const twitterCreds = require( './twitter.json' );
const tweetAttributes = [ 'created_at', 'id', 'text', 'source', 'retweet_count', 'favorite_count' ];

const tweetsPerRequest = 200;
const tweetMax = 3200;
const msBetweenQueries = (16 / 180) * 60000;

program
  .version( pkg.version )
  .usage( '<username>' )
  .parse( process.argv );

if ( !program.args.length ) {
  program.help();
}

let client = new Twitter( twitterCreds );
let currentHandle = '';
let currentTweets = [];
let first = true;

let p = null;

for ( var handle of program.args ) {
  currentHandle = handle;
  currentTweets = [];
  first = true;

  console.warn( `[start] handle: ${currentHandle}` );
  process.stdout.write( '[' );

  getTweetsPromise();
}

function getTweetsPromise( ) {
  p = new Promise( getTweets );

  p.then( getTweetsResolve ).catch( function ( reason ) {
    console.warn( `[error] handle: ${currentHandle}, reason: ${reason}` );
    process.stdout.write( ']' );
  } );;
}

function getTweetsResolve( val ) {
  if ( !first ) {
    val = val.slice(1);
  }

  console.warn( `[progress] handle: ${currentHandle}, length: ${val.length}` );
  currentTweets.push( ...val );

  for ( var tweet of val ) {
    if ( first ) {
      first = false;
    } else {
      process.stdout.write( ',' );
    }
    process.stdout.write( JSON.stringify( tweet ) );
  }

  if ( currentTweets.length >= tweetMax || val.length === 0 ) {
    process.stdout.write( ']' );
    console.warn( `[end] handle: ${currentHandle}` );
  } else {
    setTimeout( getTweetsPromise, msBetweenQueries );
  }
}

function getTweets( resolve, reject ) {
  let timelineReq = {
    screen_name: currentHandle,
    count: tweetsPerRequest
  };

  if ( currentTweets.length > 0 ) {
    timelineReq.max_id = currentTweets[ currentTweets.length - 1 ].id_str;
  }

  console.warn( `[get]`, timelineReq );
  client.get( 'statuses/user_timeline', timelineReq, function( error, tweets, response ) {
    if ( !error ) {
      resolve( tweets.map( function( t ) {
        return {
          created_at: t.created_at,
          id_str: t.id_str,
          text: t.text,
          source: t.source,
          retweet_count: t.retweet_count,
          favorite_count: t.favorite_count,
          truncated: t.truncated
        }
      } ) );
    } else {
      reject( error );
    }
  } );
  
}
