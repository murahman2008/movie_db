const OMDB_API_KEY = `8b994a24`;
const XRAPID_API_HOST = `streaming-availability.p.rapidapi.com`;
const XRAPID_API_KEY = `130ce36d5fmsh0f0f0efceef711cp1e89b1jsn6cc70b968e42`;

function searchMovieFromOMDB(movieData, pageNo = 1)
{
    let queryParam = [];

    if(movieData.movie_title)
        queryParam.push(`s=${encodeURIComponent(movieData.movie_title)}`);

    if(movieData.movie_year)
        queryParam.push(`y=${encodeURIComponent(movieData.movie_year)}`);

    if(queryParam.length <= 0)
    {
        console.log(`A movie title and/or movie year must be provided to find the movie`);
        return false;
    }

    finalURL = `http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&page=${pageNo}&${queryParam.join("&")}`;
    console.log(finalURL);

    $.ajax({
        url: finalURL,
        type: `GET`,
        dataType: 'json',
        success: function(data){
            _togglePleaseWait(false);
            displayMovieSearchResult(data, pageNo);
        },
        error: function(request, error) {
            console.log(error);
            _togglePleaseWait(false);
        }
    })
}

function fetchAMovieDetails(imdbID, callbackFunction)
{
    $.ajax({
       url: `http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${imdbID}&plot=full`,
       type: 'GET',
       dataType: 'json',
       success: function(data) {
            callbackFunction(data);
       },
       error: function(request, error) {
           console.log(error);
       } 
    })
}

function fetchStreamingServiceForMovie(movieData, callbackFunction)
{
    $.ajax({
        url: `https://streaming-availability.p.rapidapi.com/get/basic?country=us&imdb_id=${movieData.imdbID}`,
        type: 'GET',
        dataType: 'json',
        headers: {
           'X-RapidAPI-Key': XRAPID_API_KEY,
           'X-RapidAPI-Host': XRAPID_API_HOST 
        },
        success: function(data) {
            callbackFunction(data);
        },
        error: function(request, error) {
            console.log(error);
        }
    })
}

function displayMovieSearchResult(apiResponse, pageNo)
{
    if(apiResponse.Response === "False" || apiResponse.Error)
    {
        if(pageNo == 1)
            $('#search_result_container').html(apiResponse.Error);
        else
            $('#search_result_container').append('....');
    }
    else if(apiResponse.Response === "True" && apiResponse.Search)
    {
        console.log(apiResponse);
        let movieIdArray = [];

        apiResponse.Search.map(movieData => {
            movieIdArray.push(movieData.imdbID);

            let rowHTML = `
                <div class = "row" id = "${movieData.imdbID}" style = "padding:10px; border:solid 1px lightgray; border-radius:4px; margin-bottom:10px;">
                    <div class = "col-xs-12 col-md-2"><img style = "width:150px;" src = "${movieData.Poster}" alt = "Poster of ${movieData.Title}"/></div>
                    <div class = "col-xs-12 col-md-6">
                        <div class = "row">
                            <div class = "col-xs-12 col-md-6 movie_title"><h4>${movieData.Title}</h4></div>
                            <div class = "col-xs-12 col-md-2 imdb_rating"></div>
                            <div class = "col-xs-12 col-md-1 release_year" style = "padding:0px;"><h4>${movieData.Year}</h4></div>
                            <div class = "col-xs-12 col-md-2" style = "padding-top:9px;">
                                <input type = "button" class = "btn btn-primary" value = "Details" />
                            </div>
                        </div>
                        <div class = "row">
                            <div class = "col-xs-12 plot" style = "padding:15px;"></div>
                        </div>
                    </div>
                    <div class = "col-xs-12 col-md-2">
                        <div class = "row">
                            <div class = "col-xs-12 box_office_amount"></div>
                            <div class = "col-xs-12 where_to_watch"></div>
                        </div>
                    </div>
                    <div class = "col-xs-12 col-md-2">
                        <input type = "button" class = "btn btn-primary" value = "Add to my list" />
                    </div>
                </div>    
            `;
            $('#search_result_container').append(rowHTML);
        });

        showLoadMore((pageNo*1)+1);

        for(let i = 0; i < movieIdArray.length; i++)
        {
            fetchAMovieDetails(movieIdArray[i], function(movieData){
                if(movieData.Plot)
                    $('#' + movieData.imdbID + ' .plot').html(`<p>${movieData.Plot}</p>`);

                if(movieData.BoxOffice)                
                    $('#' + movieData.imdbID + ' .box_office_amount').html(`<h4>${movieData.BoxOffice}</h4>`);

                if(movieData.imdbRating)
                    $('#' + movieData.imdbID + ' .imdb_rating').html(`<h4>${movieData.imdbRating}</h4>`);

                fetchStreamingServiceForMovie(movieData, function(mData){
                    if(Object.keys(mData.streamingInfo).length > 0)
                    {
                        for(let key in mData.streamingInfo)
                        {
                            $('#' + mData.imdbID + ' .where_to_watch').append(`<h4><a href = "${mData.streamingInfo[key]["us"]["link"]}" target = "_blank">${key}</h4>`);
                        } 
                    }
                });
            });
        }        
    }
}

function loadNextPage(lmButton)
{
    let pageNo = $(lmButton).attr('data_page_no');
    hideLoadMore();
    let searchCriteria = $('#search_criteria').val();
    searchCriteria = JSON.parse(searchCriteria);
    searchMovieFromOMDB(searchCriteria, pageNo);
}

function showLoadMore(pageNo)
{
    $('#load_more_container').show();
    $('#load_more_container .load_more_btn').attr('data_page_no', pageNo);
}

function hideLoadMore()
{
    $('#load_more_container').hide();
}

function clearMovieSearchResultDisplay()
{
    $('#search_result_container').html('');
    $('#load_more_container').hide();
}

function _togglePleaseWait(show = true)
{
    if(show)
        console.log(`Please Wait...`);
    else
        console.log(`Close Please wait...`);
}

function searchMovie(form)
{
    clearMovieSearchResultDisplay();

    $('#search_criteria').val('');

    let movieTitle = $(form).find('#movie_title').val().trim();
    let movieYear = $(form).find('#movie_year').val().trim();

    let errorArray = [];
    let movieData = {};

    if(movieTitle === '')
        errorArray.push(`Please enter a movie title to search for it`);
    else
        movieData.movie_title = movieTitle;

    if(movieYear)
    {
        if(isNaN(movieYear) || movieYear <= 0)
            errorArray.push(`Please provide a valid year.`);
        else
            movieData.movie_year = movieYear;
    }

    if(errorArray.length > 0)
        alert(errorArray.join("\n"));
    else
    {
        _togglePleaseWait(true);
        $('#search_criteria').val(JSON.stringify(movieData));
        searchMovieFromOMDB(movieData);
    }
    
    return false;
}

$(function(){
    console.log(`dom loaded`);
    clearMovieSearchResultDisplay();
});
