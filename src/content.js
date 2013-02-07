var content;

(function () {
  content = function (contentAggregate) {
    var init = function (contentIdea) {
      if (contentIdea.ideas)
        _.each(contentIdea.ideas, function (value, key) {
          contentIdea.ideas[key] = init(value);
        });
      contentIdea.id = contentIdea.id || (contentAggregate.maxId() + 1);
      contentIdea.containsDirectChild=contentIdea.findChildRankById = function (childIdeaId) {
        return parseFloat(_.reduce(
          contentIdea.ideas,
          function(res, value, key) {
            return value.id == childIdeaId ? key : res;
          },
          undefined
        ));
      };
      contentIdea.findSubIdeaById = function(childIdeaId){
        var myChild= _.find(contentIdea.ideas,function(idea){return idea.id==childIdeaId;})
        return myChild ||
          _.reduce (contentIdea.ideas, function(result,idea){
             return result || idea.findSubIdeaById(childIdeaId);
          },
          undefined);
      };
      contentIdea.find = function(predicate){
        var current= predicate(contentIdea) ? [_.pick(contentIdea,'id','title')] : [];
        if (_.size(contentIdea.ideas)==0)
          return current;
        else
          return _.reduce(contentIdea.ideas,function(result,idea){ return _.union(result,idea.find(predicate)) },current);
      };
      return contentIdea;
    };
    contentAggregate.maxId = function maxId(idea) {
      idea = idea || contentAggregate;
      if (!idea.ideas)
        return idea.id || 0;
      return _.reduce(
        idea.ideas,
        function (result, subidea){
          return Math.max(result, maxId(subidea));
        },
        idea.id || 0
      );
    };


    /*** private utility methods ***/
    var maxKey=function(kv_map,sign){
      sign=sign||1;
      if (_.size(kv_map)==0) return 0;
      var current_keys=_.keys(kv_map);
      current_keys.push(0); /* ensure at least 0 is there for negative ranks */
      return _.max(_.map(current_keys,parseFloat),function(x){return x*sign});
    }
    var nextChildRank=function(parentIdea){
      var childRankSign=1;
      if (parentIdea.id==contentAggregate.id){
        counts= _.countBy(parentIdea.ideas, function(v,k){ return k<0; });
        if ((counts.true||0)<counts.false) childRankSign=-1;
      }
      var new_rank=maxKey(parentIdea.ideas,childRankSign)+childRankSign;
      return new_rank;
    }
    var appendSubIdea=function(parentIdea,subIdea){
      if (!parentIdea.ideas) parentIdea.ideas={}

      parentIdea.ideas[nextChildRank(parentIdea)]=subIdea;
    }
    var findIdeaById = function (ideaId){
      return contentAggregate.id==ideaId?contentAggregate:contentAggregate.findSubIdeaById(ideaId);
    }
	var sameSideSiblingRanks = function (parentIdea, ideaRank){
		return _(_.map(_.keys(parentIdea.ideas), parseFloat)).reject(function(k){return k*ideaRank<0});
	}
    var traverseAndRemoveIdea = function (parentIdea,subIdeaId) {
      var childRank=parentIdea.findChildRankById(subIdeaId);
      if (childRank){
        var deleted= parentIdea.ideas[childRank];
        delete parentIdea.ideas[childRank];
        return deleted;
      }
      return _.reduce(
        parentIdea.ideas,
        function (result, child) {
          return result || traverseAndRemoveIdea(child,subIdeaId);
        },
        false
      );
    }
    contentAggregate.findParent = function (subIdeaId) {
      var parentIdea=arguments[1] || contentAggregate;
      var childRank=parentIdea.findChildRankById(subIdeaId);
      if (childRank){
        return parentIdea;
      }
      return _.reduce(
        parentIdea.ideas,
        function (result, child) {
          return result || contentAggregate.findParent(subIdeaId, child);
        },
        false
      );
    }
	contentAggregate.nextSiblingId = function (subIdeaId) {
		var parentIdea=contentAggregate.findParent(subIdeaId),
			currentRank, candidateSiblingRanks, siblingsAfter;
		if (!parentIdea) return false;
		currentRank=parentIdea.findChildRankById(subIdeaId);
		candidateSiblingRanks=sameSideSiblingRanks(parentIdea,currentRank);
		siblingsAfter=_.reject(candidateSiblingRanks,function(k){ return Math.abs(k)<=Math.abs(currentRank) });
		if (siblingsAfter.length===0) return false;
		return parentIdea.ideas[_.min(siblingsAfter,Math.abs)].id;
	}
	contentAggregate.previousSiblingId = function (subIdeaId) {
		var parentIdea=contentAggregate.findParent(subIdeaId),
			currentRank, candidateSiblingRanks, siblingsBefore;
		if (!parentIdea) return false;
		currentRank=parentIdea.findChildRankById(subIdeaId);
		candidateSiblingRanks=sameSideSiblingRanks(parentIdea,currentRank);
		siblingsBefore=_.reject(candidateSiblingRanks,function(k){ return Math.abs(k)>=Math.abs(currentRank) });
		if (siblingsBefore.length===0) return false;
		return parentIdea.ideas[_.max(siblingsBefore,Math.abs)].id;
	}
    /* intentionally not returning 0 case, to help with split sorting into 2 groups */
    var sign=function(number){
      return number<0?-1:1;
    }
    /**** aggregate command processing methods ****/
    contentAggregate.flip = function (ideaId){
      var current_rank=contentAggregate.findChildRankById(ideaId);
      if (!current_rank) return false;
      var max_rank = maxKey(contentAggregate.ideas,-1*sign(current_rank));
      new_rank = max_rank - 10 * sign(current_rank);
      contentAggregate.ideas[new_rank] = contentAggregate.ideas[current_rank];
      delete contentAggregate.ideas[current_rank];
      contentAggregate.dispatchEvent('changed','flip', [ideaId]);
      return true;
    }
    contentAggregate.updateTitle = function (ideaId, title) {
      var idea=findIdeaById(ideaId);
      if (!idea) return false;
      idea.title=title;
      contentAggregate.dispatchEvent('changed','updateTitle', [ideaId,title]);
      return true;
    };
    contentAggregate.addSubIdea = function(parentId,ideaTitle){
      var newId=arguments[2];
      if (newId && findIdeaById(newId)) return false;
      var parent=findIdeaById(parentId);
      if (!parent) return false;
      var idea= init({title:ideaTitle,id:newId});
      appendSubIdea(parent,idea);
      contentAggregate.dispatchEvent('changed','addSubIdea',[parentId,ideaTitle,idea.id]);
      return true;
    }
    contentAggregate.removeSubIdea = function (subIdeaId){
      var result = traverseAndRemoveIdea(contentAggregate,subIdeaId);
      if (result) {
        contentAggregate.dispatchEvent('changed','removeSubIdea',[subIdeaId]);
      }
      return result;
    }
    contentAggregate.insertIntermediate= function (inFrontOfIdeaId, title, newIdeaId){
      if (newIdeaId && findIdeaById(newIdeaId)) return false;
      if (contentAggregate.id==inFrontOfIdeaId) return false;
      var parentIdea=contentAggregate.findParent(inFrontOfIdeaId); 
      if (!parentIdea) return false;
      var childRank=parentIdea.findChildRankById(inFrontOfIdeaId);
      if (!childRank) return false;
      var oldIdea=parentIdea.ideas[childRank];
      var newIdea= init({title:title,id:newIdeaId});
      parentIdea.ideas[childRank]=newIdea;
      newIdea.ideas={1:oldIdea}
      contentAggregate.dispatchEvent('changed','insertIntermediate',[inFrontOfIdeaId, title,  newIdea.id]);
      return true;
    }
    contentAggregate.changeParent = function (ideaId, newParentId){
      if (ideaId==newParentId) return false;
      var parent=findIdeaById(newParentId);
      if (!parent) return false;
      var idea=contentAggregate.findSubIdeaById(ideaId);
      if (!idea) return false;
      if (idea.findSubIdeaById(newParentId)) return false;
      if (parent.containsDirectChild(ideaId)) return false;
      traverseAndRemoveIdea(contentAggregate,ideaId);
      if (!idea) return false;
      appendSubIdea(parent,idea);
      contentAggregate.dispatchEvent('changed','changeParent',[ideaId,newParentId]);
      return true;
    }
    contentAggregate.positionBefore = function (ideaId, positionBeforeIdeaId) {
      var parentIdea = arguments[2] || contentAggregate;
      var current_rank=parentIdea.findChildRankById(ideaId);
      if (!current_rank)
        return _.reduce(
          parentIdea.ideas,
          function (result, idea) {
            return result || contentAggregate.positionBefore(ideaId, positionBeforeIdeaId, idea)
          },
          false
        );
      if (ideaId == positionBeforeIdeaId)
        return false;
      var new_rank = 0;
      if (positionBeforeIdeaId) {
        var after_rank = parentIdea.findChildRankById(positionBeforeIdeaId);
        if (!after_rank) return false;
        var sibling_ranks=sameSideSiblingRanks(parentIdea,current_rank);
        var candidate_siblings=_.reject(_.sortBy(sibling_ranks,Math.abs),function(k){ return Math.abs(k)>=Math.abs(after_rank) });
        var before_rank = candidate_siblings.length > 0 ? _.max(candidate_siblings) : 0;
        if (before_rank == current_rank)
          return false;
        new_rank = before_rank + (after_rank - before_rank) / 2;
      } else {
        var max_rank = maxKey(parentIdea.ideas,current_rank<0?-1:1);
        if (max_rank == current_rank)
          return false;
        new_rank = max_rank + 10 * (current_rank < 0 ? -1 : 1);
      }
      if (new_rank==current_rank) return false;
      parentIdea.ideas[new_rank] = parentIdea.ideas[current_rank];
      delete parentIdea.ideas[current_rank];
      contentAggregate.dispatchEvent('changed','positionBefore',[ideaId,positionBeforeIdeaId]);
      return true;
    }
    init(contentAggregate);
    return observable(contentAggregate);
  }
})();
