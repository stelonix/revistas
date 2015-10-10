
function AjaxManager() {
	this.RequestedPages = {};
	this.WaitingIdentifiers = {};
}

AjaxManager.prototype.RegisterGet = function(page_url, identifier, func) {
	return this.Register(page_url, identifier, func, 'get');
};

AjaxManager.prototype.Register = function (page_url, identifier, func, get_func) {
	if (typeof get_func === "undefined") get_func = 'getJSON';
	var ajm = this;
	if (!(identifier in this.RequestedPages)) {
		this.RequestedPages[identifier] = { Completed: false, Hooks: [] };
	}
	this.Require(identifier, func);
	this.RequestedPages[identifier].xhr = $[get_func](page_url, null, function (data) {
		ajm.RequestedPages[identifier].Data = data;
		ajm.RequestedPages[identifier].Completed = true;
		ajm.FireHooks(identifier, data);
	});
	if (this.WaitingIdentifiers[identifier] != null) {
		$.each(this.WaitingIdentifiers[identifier], function(k, cb) {
			cb();
		});
		delete this.WaitingIdentifiers[identifier];
		console.log("Future hook removed");
	}
	return this.RequestedPages[identifier].xhr;
};

AjaxManager.prototype.FireHooks = function (identifier) {
	var ajm = this;
	if (this.RequestedPages[identifier].Hooks.length > 0) {
		var clone_hooks = this.RequestedPages[identifier].Hooks;
		this.RequestedPages[identifier].Hooks = [];
		$.each(clone_hooks, function (k, hook) {
			hook(ajm.RequestedPages[identifier].Data);
		});
	}
};

AjaxManager.prototype.Require = function (identifier, func) {
	var ajm = this;
	function add_string_hook() {
		ajm.RequestedPages[identifier].Hooks.push(func);
		if (ajm.RequestedPages[identifier].Completed) {
			ajm.FireHooks(identifier);
		}
	}

	function add_array_hook() {
		var indexes_to_remove = [];
		$.each(identifier, function (k, v) {
			indexes_to_remove.push(ajm.RequestedPages[v].Hooks.length);
		});

		function multi_hook_internal() {
			var completed = true;
			$.each(identifier, function (k, v) {
				if (!ajm.RequestedPages[v].Completed) {
					completed = false;
					return false;
				}
			});
			if (completed) {
				$.each(identifier, function (k, iden) {
					$.each(indexes_to_remove.reverse(), function (a, index) {
						ajm.RequestedPages[iden].Hooks.splice(index, 1);
					});
				});
				func();
			}
		}
		$.each(identifier, function (k, v) {
			ajm.RequestedPages[v].Hooks.push(multi_hook_internal);
		});
	}

	if (typeof identifier === 'string') {
		if (identifier in this.RequestedPages) add_string_hook();
		else this.AddFutureHook(identifier, add_string_hook);
	} else {
		var here = true;
		$.each(identifier, function (k, iden) {
			if (!(iden in ajm.RequestedPages)) {
				here = false;
				ajm.AddFutureHook(iden, add_array_hook);
			}
		});
		if (here) add_array_hook();
	}
};
AjaxManager.prototype.AddFutureHook = function (identifier, func) {
	if (this.WaitingIdentifiers[identifier] == null) this.WaitingIdentifiers[identifier] = [];
	this.WaitingIdentifiers[identifier].push(func);
	console.log("Future hook");
};
var ajax_manager = new AjaxManager();