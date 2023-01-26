const PrismicHelpers = require( '../../../prismic/utils' );
const route = 'portfolio';

module.exports = app => handleRouteRequest( app );

function handleRouteRequest( app ) {
    const mainRouteHandler = async ( req, res, next ) => {
        try {
            const content = await PrismicHelpers.getSinglePage( req.prismic, 'portfolio_landing_page' );

            let portfolioItems = await PrismicHelpers.queryByType( req.prismic, 'portfolio_company', [], {
                orderings: {
                    field: 'my.portfolio_company.display_order'
                }
            } );

            let isSplit = false;
            portfolioItems = portfolioItems.map( ( item, i ) => {
                item.className = item.display_type === 'Tall Cell'
                    ? '--tall'
                    : item.display_type === 'Split Cell'
                        ? '--split'
                        : '';

                item.primaryImage = item.portfolio_grid_images?.length > 0
                    ? item.portfolio_grid_images[ 0 ]?.image
                    : null;

                item.hasSlides = item.portfolio_grid_images?.length > 1;
                item.isSplit = item.className === '--split';

                if ( item.isSplit && !isSplit ) {
                    item.isFirstSplit = true;
                    isSplit = true;
                }
                else if ( item.isSplit ) {
                    item.isEndSplit = true;
                    isSplit = false;
                }
                
                return item;
            } );

            const leftColItems = portfolioItems.filter( ( item ) => item.portfolio_grid_column === 'Left' );
            const rightColItems = portfolioItems.filter( ( item ) => item.portfolio_grid_column === 'Right' );            

            const data = {
                ...res.locals,
                ...content,
                portfolioItems,
                leftColItems,
                rightColItems
            };

            res.locals = data;
            res.indexPath = route;
            next();
        }
        catch ( e ) {
            res.status( e.status || 500 );
            res.render( 'error', {
                message: e.message,
                error: {}
            } );
        }
    };

    app.get( `/${route}`, mainRouteHandler );
    app.get( `/${route}/:uid`, mainRouteHandler );

    app.get( `/api/v1/${route}/:uid`, async ( req, res ) => {
        try {
            const { uid } = req.params;
            const data = await PrismicHelpers.getByUID( req.prismic, 'portfolio_company', uid );
            data.overview = PrismicHelpers.getRichTextHTML( data.overview );

            const portfolioItems = await PrismicHelpers.queryByType( req.prismic, 'portfolio_company', [], {
                orderings: {
                    field: 'my.portfolio_company.display_order'
                }
            } );

            portfolioItems.forEach( ( item, i ) => {
                if ( item.uid === uid ) {
                    const prevIndex = i === 0 ? portfolioItems.length - 1 : i - 1;
                    const nextIndex = i === portfolioItems.length - 1 ? 0 : i + 1;

                    data.prevLink = portfolioItems[prevIndex].url;
                    data.nextLink = portfolioItems[nextIndex].url;
                }
            } );

            res.status( 200 ).json( {
                data,
                message: 'ok',
                status: 200
            } );
        }
        catch ( e ) {
            res.status( 500 ).json( {
                data: {},
                message: e.message,
                status: 500
            } );
        }
    } );
}