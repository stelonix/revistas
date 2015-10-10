

var adding = false;

function make_revista(obj) {
	if (typeof obj.Estados === 'undefined') obj.Estados = [];
	obj.add_estado = function (est) {
		obj.Estados.push(est);
	}
	obj.has_estado = function(est) {
		return this.Estados.indexOf(est) > -1;
	}
	obj.estado = function(est, markers) {
		if (typeof markers === 'undefined') markers = {};
		if (typeof markers.v === 'undefined') markers.v = '✅';
		if (typeof markers.x === 'undefined') markers.x = '✗';
		return this.has_estado(est) ? markers.v : markers.x;
	}
	return obj;
}
var revistas = {};
var revistas_ids = {};

// var estados = {
// 	{
// 		nome: rasgos,
// 		markers: { v: '✅', x: '✗'},
// 		classname: '✗'
// 	}

// }

function get_revista_form(rev) {
	return rev.sigla.trim().length > 0 ?
	'$Sigla - $Nome'
		.replace('$Sigla',rev.sigla)
		.replace('$Nome',rev.nome) :
	rev.nome;
}

function init_autocomplete(data) {
	var arr = [];
	$.each(data, function(k,v) {
		arr.push(get_revista_form(v));
		revistas[v.id] = v;
		revistas_ids[v.nome] = v;
	});

	$('input[name="revista"]').autoComplete(
		{
			minChars: 1,
			source: function(term, suggest){
		        term = term.toLowerCase();
		        var choices = arr;
		        var matches = [];
		        for (i=0; i<choices.length; i++)
		            if (~choices[i].toLowerCase().indexOf(term)) matches.push(choices[i]);
		        suggest(matches);
		    }
		}
	);
}

function init_revistas(data) {
	var i = 1;
	$.each(data, function(k,v) {
		var rev = make_revista(v);
		add_revista(rev, i);
		i++;
	});
}

function update_count() {
	$.getJSON('./count', function(data) {
		document.title = '($c) - Revistas'.replace('$c', data);
		setTimeout(update_count, 10*1000);
	})
}

function main(is_public) {
	is_public = is_public != "";
	async.series([
		function(cb) {
			$.getJSON('./revistas', init_autocomplete);
			cb();
		},
		function(cb) {
			if (is_public) $.getJSON('./public', init_revistas);
			else $.getJSON('./all', init_revistas);
			cb();
		}
	]);
	
	
	$('input[type="checkbox"]').change(function() {
		if (!$('input[name="rasgos"]')[0].checked &&
			!$('input[name="manchas"]')[0].checked &&
			!$('input[name="amarelado"]')[0].checked &&
			!$('input[name="avariado"]')[0].checked){
			$('input[name="legivel"]').removeAttr('checked');
			$('input[name="legivel"]').hide();
		} else $('input[name="legivel"]').show();
	});
	$('tfoot input').keypress(function(e) {
		if(e.which == 13 && !adding) {
			adding = true;
			try {
        		e.preventDefault();
        		try_add_revista();
        	} catch (_) {
        		adding = false;
        	}
    	}
	});
	update_count();
}

function add_revista(rev, index) {
	var n = $($('.iden_tr')[0].outerHTML
		.replace('$numero', rev.numero)
		.replace('$revista', revistas[rev.revista_id].nome)
		.replace('$saco', rev.saco)
		.replace('$rasgos', rev.estado('Rasgado'))
		.replace('$completo', rev.estado('Completo'))
		.replace('$manchas', rev.estado('Manchas'))
		.replace('$brindes', rev.estado('Brindes'))
		.replace('$amarelado', rev.estado('Amarelado'))
		.replace('$avariado', rev.estado('Avariado'))
		.replace('$legivel', rev.estado('Legível', {x:''}))
		.replace('$id', rev.id)
		.replace('$CURRENT_INDEX', index)
		.replace('$obs', rev.extra));
	n.removeClass('iden_tr');
	n.find('.chk').each(function(k,v) {
		if (rev.estado($(v).data('field')) == '✅') $(v).addClass('v');
		else if (rev.estado($(v).data('field'),eval($(v).data('markers'))) == '✗') $(v).addClass('x');
		else {
			/*if (eval($(v).data('markers')).x == '✅') {
			//	$(v).addClass('ॐ');
			} else {*/
			//$(v).addClass('ॐ');
			//$(v).html('ॐ');
		}
		
	});
	$('table').append(n);
}

function get_nome_revista(input_str) {
	var tmp = input_str.split('-');
	var pot_sigla = tmp[0].trim();
	tmp.splice(0,1);
	var pot_nome = tmp.join('-').trim();
	var actual_nome;
	$.each(revistas, function(k,v) {
		if (v.sigla == pot_sigla && v.nome == pot_nome) {
			actual_nome = v.nome;
			return false;
		}
	});
	if (typeof actual_nome === 'undefined') actual_nome = input_str;
	return actual_nome;
}

function empty_string(value) {
    return value ? value.trim().length == 0 : true;
}

function make_revista_from_form() {
	var rev = make_revista({});
	rev.numero = $('input[name="numero"]').val();
	try {
		var actual_nome = get_nome_revista($('input[name="revista"]').val());
		rev.revista_id = revistas_ids[actual_nome].id;
	} catch(_) {
		rev.revista = {
			nome: $('input[name="revista"]').val(),
			editora: window.prompt('Editora'),
			sigla: window.prompt('Sigla')
		};
	}
	if (typeof rev.revista !== 'undefined') {
		if (empty_string(rev.revista.editora) && empty_string(rev.revista.sigla)) {
			//showNotificationBar("Cancelado");
			alert("Cancelado");
			return;
		}
	}
	rev.saco = $('input[name="saco"]').val();
	if ($('input[name="rasgos"]').is(':checked')) rev.add_estado('Rasgado');
	if ($('input[name="completa"]').is(':checked')) rev.add_estado('Completo');
	if ($('input[name="manchas"]').is(':checked')) rev.add_estado('Manchas');
	if ($('input[name="legivel"]').is(':checked')) rev.add_estado('Legível');
	if ($('input[name="brindes"]').is(':checked')) rev.add_estado('Brindes');
	if ($('input[name="amarelado"]').is(':checked')) rev.add_estado('Amarelado');
	if ($('input[name="avariado"]').is(':checked')) rev.add_estado('Avariado');
	rev.extra = $('textarea[name="obs"]').val();
	return rev;
}
var old_revista = {};
function try_add_revista() {
	var rev = make_revista_from_form();
	if (typeof rev === 'undefined') {
		return;
		alert("");
	}
	$.ajax(
		{	type: "POST",
			contentType: "application/json; charset=utf-8",
			url: '/add',
			data: JSON.stringify(rev),
			dataType: "text",
			success: function(data) {
				console.log("All ok");
				var new_rev = make_revista(JSON.parse(data));
				if (typeof rev.revista !== 'undefined') {
					revistas[new_rev.revista_id] = rev.revista;
					$.getJSON('./revistas', init_autocomplete);
				}
				old_revista = rev;
				old_revista.revista_id = new_rev.revista_id;
				add_revista(new_rev, parseInt($('table > tbody > tr:last-child > td:first-child').html())+1);
				$('input,textarea').val('');
				$('input[type="checkbox"]').removeAttr('checked');
				$('input[name="numero"]').focus();
				$('input[name="saco"]').val(old_revista.saco);
				adding = false;
			},
			error: function() {alert('Erro');}
		}
	);
}
function get_last_revista() {
	if (typeof old_revista.numero === 'undefined') return;
	$('input[name="numero"]').val(old_revista.numero);
	$('input[name="revista"]').val(get_revista_form(revistas[old_revista.revista_id]));
	if (old_revista.has_estado('Rasgado')) $('input[name="rasgos"]').prop('checked', true);
	if (old_revista.has_estado('Completo')) $('input[name="completa"]').prop('checked', true);
	if (old_revista.has_estado('Manchas')) $('input[name="manchas"]').prop('checked', true);
	if (old_revista.has_estado('Legível')) $('input[name="legivel"]').prop('checked', true);
	if (old_revista.has_estado('Brindes')) $('input[name="brindes"]').prop('checked', true);
	if (old_revista.has_estado('Amarelado')) $('input[name="amarelado"]').prop('checked', true);
	if (old_revista.has_estado('Avariado')) $('input[name="avariado"]').prop('checked', true);
	$('input[name="saco"]').val(old_revista.saco);
	$('textarea[name="obs"]').val(old_revista.extra);
}

function hl(tr) {
	$(tr).find('.chk').addClass('lighter');
}

function dehl(tr) {
	$(tr).find('.chk').removeClass('lighter');
}

function showNotificationBar(message, duration, bgColor, txtColor, height) {

    /*set default values*/
    duration = typeof duration !== 'undefined' ? duration : 1500;
    bgColor = typeof bgColor !== 'undefined' ? bgColor : "#F4E0E1";
    txtColor = typeof txtColor !== 'undefined' ? txtColor : "#A42732";
    height = typeof height !== 'undefined' ? height : 40;
    /*create the notification bar div if it doesn't exist*/
    if ($('#notification-bar').size() == 0) {
        var HTMLmessage = "<div class='notification-message' style='text-align:center; line-height: " + height + "px;'> " + message + " </div>";
        $('body').prepend("<div id='notification-bar' style='display:none; width:100%; height:" + height + "px; background-color: " + bgColor + "; position: fixed; z-index: 100; color: " + txtColor + ";border-bottom: 1px solid " + txtColor + ";'>" + HTMLmessage + "</div>");
    }
    /*animate the bar*/
    $('#notification-bar').slideDown(function() {
        setTimeout(function() {
            $('#notification-bar').slideUp(function() {});
        }, duration);
    });
}

function second_best_estados() {
	$('input[type="checkbox"]').removeAttr('checked');
	$('input[name="completa"]').prop('checked', true);
	$('textarea').val('');
}

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}