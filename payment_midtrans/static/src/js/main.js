odoo.define('payment.acquirer.midtrans', function(require) {
    "use strict";

    // The following currencies are integer only, see
    // https://stripe.com/docs/currencies#zero-decimal
    var int_currencies = [
        'BIF', 'XAF', 'XPF', 'CLP', 'KMF', 'DJF', 'GNF', 'JPY', 'MGA', 'PYG',
        'RWF', 'KRW', 'VUV', 'VND', 'XOF'
    ];

    if ($.blockUI) {
        // our message needs to appear above the modal dialog
        $.blockUI.defaults.baseZ = 2147483647; //same z-index as StripeCheckout
        $.blockUI.defaults.css.border = '0';
        $.blockUI.defaults.css["background-color"] = '';
        $.blockUI.defaults.overlayCSS["opacity"] = '0.9';
    }

    require('web.dom_ready');
    if (!$('.o_payment_form').length) {
        return $.Deferred().reject("DOM doesn't contain '.o_payment_form'");
    }

    var observer = new MutationObserver(function(mutations, observer) {
        for(var i=0; i<mutations.length; ++i) {
            for(var j=0; j<mutations[i].addedNodes.length; ++j) {
                if(mutations[i].addedNodes[j].tagName.toLowerCase() === "form" && mutations[i].addedNodes[j].getAttribute('provider') == 'midtrans') {
                    display_midtrans_form($(mutations[i].addedNodes[j]));
                }
            }
        }
    });


    function display_midtrans_form(provider_form) {
        // Open Checkout with further options
        var payment_form = $('.o_payment_form');
        if(!payment_form.find('i').length)
            payment_form.append('<i class="fa fa-spinner fa-spin"/>');
            payment_form.attr('disabled','disabled');

        var acquirer_id = payment_form.find('input[type="radio"][data-provider="midtrans"]:checked').data('acquirer-id');
        if (! acquirer_id) {
            return false;
        }

        var access_token = $("input[name='access_token']").val() || $("input[name='token']").val();
        var so_id = $("input[name='return_url']").val().match(/quote\/([0-9]+)/) || undefined;
        if (so_id) {
            so_id = parseInt(so_id[1]);
        }


        var currency = $("input[name='currency']").val();
        var currency_id = $("input[name='currency_id']").val();
        var amount = parseFloat($("input[name='amount']").val() || '0.0');


        if ($('.o_website_payment').length !== 0) {
            var create_tx = ajax.jsonRpc('/website_payment/transaction', 'call', {
                    reference: $("input[name='invoice_num']").val(),
                    amount: amount, // exact amount, not stripe cents
                    currency_id: currency_id,
                    acquirer_id: acquirer_id
            });
        }
        else if ($('.o_website_quote').length !== 0) {
            var url = _.str.sprintf("/quote/%s/transaction/", so_id);
            var create_tx = ajax.jsonRpc(url, 'call', {
                access_token: access_token,
                acquirer_id: acquirer_id
            }).then(function (data) {
                try { provider_form[0].innerHTML = data; } catch (e) {};
            });
        }
        else {
            var create_tx = ajax.jsonRpc('/shop/payment/transaction/' + acquirer_id, 'call', {
                    so_id: so_id,
                    access_token: access_token,
                    acquirer_id: acquirer_id
            }).then(function (data) {
                try { provider_form.innerHTML = data; } catch (e) {};
            });
        }
        create_tx.done(function () {
            if (!_.contains(int_currencies, currency)) {
                amount = amount*100;
            }
            getStripeHandler().open({
                name: $("input[name='merchant']").val(),
                description: $("input[name='invoice_num']").val(),
                email: $("input[name='email']").val(),
                currency: currency,
                amount: amount,
            });
        });
    }

}
);
