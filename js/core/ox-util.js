// Define module HexUtil

"use strict";

module.exports = (function () {

	// ========================================================================
	// === Simple Linked List implementation ===
	// ========================================================================
	function LinkedList () {
		this.first = null;
		this.last  = null;
		this.length = 0;
	}
	LinkedList.prototype.insert = function (index, data){
		var insertAfterNode, dataNode;

		dataNode = new LinkedListNode(data);

		if (this.length === 0) {
			this.first = dataNode;
			this.last  = dataNode;
		} else {
			insertAfterNode = this.get(index);
			if (insertAfterNode.next !== null) {
				insertAfterNode.next.prev = dataNode;
			}
			insertAfterNode.next = data;
		}

		if (index === this.length-1) {
			this.last = dataNode;
		}

		this.length += 1;
		return;
	};

	LinkedList.prototype.remove = function (index) {
		return this.removeElement(this.getNode(index));
	};

	LinkedList.prototype.removeElement = function (node) {
		var removeNode;

		if (node === null) {return;}

		removeNode = node;
		if (removeNode.next !== null &&
			removeNode.prev !== null)
		{
			removeNode.next.prev = removeNode.prev;
			removeNode.prev.next = removeNode.next;
		}
		else if (removeNode.next === null &&
				 removeNode.prev === null)
		{
			this.first = null;
			this.last  = null;
		}
		else if (removeNode.next === null)
		{
			removeNode.prev.next = null;
			this.last            = removeNode.prev;
		}
		else if (removeNode.prev === null)
		{
			removeNode.next.prev = null;
			this.first           = removeNode.next;
		}

		removeNode.next = null;
		removeNode.prev = null;

		this.length -= 1;
		return removeNode.data;
	};

	LinkedList.prototype.get = function (index) {
		return this.getNode(index).data;
	};

	LinkedList.prototype.getNode = function (index) {
		var length, searchIndex, searchNode;

		length = this.length;
		if (length - index > length/2) {
			// Search from end
			searchIndex = length-index-1;
			searchNode  = this.last;
			while (searchIndex > 0) {
				searchIndex -= 1;
				searchNode   = searchNode.prev;
			}
		} else {
			// Search from start
			searchIndex = index;
			searchNode  = this.first;
			while (searchIndex > 0) {
				searchIndex -= 1;
				searchNode   = searchNode.next;
			}
		}
		return searchNode;
	};

	LinkedList.prototype.peek   = function () {};
	
	LinkedList.prototype.pop    = function () {
		var node;

		if (this.length === 0) {return null;}

		node = this.last;

		if (node.prev !== null) {
			node.prev.next = null;
		} else {
			this.first = null;
		}

		this.last = node.prev;

		this.length -= 1;
		return node.data;
	};
	
	LinkedList.prototype.push = function (data) {
		var node;

		node = new LinkedListNode(data);

		if (this.length === 0) {
			this.first = node;
			this.last  = node;
		} else {
			node.prev = this.last;
			this.last.next = node;
			this.last      = node;
		}

		this.length += 1;
		return;
	};

	// LinkedList.prototype.iterator = function* () {};

	function LinkedListNode (data) {
		this.next = null;
		this.prev = null;

		this.data = data;
	}
	// ========================================================================
	// === END Simple Linked List implementation

	// ========================================================================
	// === Hash set for coordinates
	// ========================================================================	
	function CoordinateSet () {
		this.hash = Object.create(null);
	}

	CoordinateSet.prototype.add = function ( x, y, z ) {
		var hash;

		hash = this.hash;
		hash = hash[x];
		if (hash === undefined) {
			this.hash[x] = Object.create(null);
			hash = this.hash[x];
		}

		hash = hash[y];
		if (hash === undefined) {
			this.hash[x][y] = Object.create(null);
			hash = this.hash[x][y];
		}

		hash[z] = true;
	};
	CoordinateSet.prototype.remove = function (x, y, z) {
		var hash;
		hash = this.hash[x];
		if (hash === undefined) {return;}
		hash = this.hash[y];
		if (hash === undefined) {return;}
		hash = this.hash[z];
		hash[z] = false;
	};
	CoordinateSet.prototype.in = function (x, y, z) {
		var hash = this.hash;
		hash = hash[x];
		hash = hash && hash[y];
		hash = hash && hash[z];
		return hash;
	};
	// ========================================================================
	// === END Hash set for coordinates

	// ========================================================================
	// === Exported API
	// ========================================================================
	var API = {
		LinkedList: LinkedList,
		CoordinateSet: CoordinateSet
	};
	return API;
}());